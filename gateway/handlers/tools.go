package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"github.com/labdao/plex/gateway/models"
	"github.com/labdao/plex/gateway/utils"
	"github.com/labdao/plex/internal/ipfs"
	"github.com/labdao/plex/internal/ipwl"

	"gorm.io/gorm"
)

func AddToolHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		log.Println("Received request at /add-tool")
		body, err := ioutil.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Bad request", http.StatusBadRequest)
			return
		}

		log.Println("Request body: ", string(body))

		requestData := make(map[string]json.RawMessage)
		err = json.Unmarshal(body, &requestData)
		if err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}

		var walletAddress string
		err = json.Unmarshal(requestData["walletAddress"], &walletAddress)
		if err != nil || walletAddress == "" {
			http.Error(w, "Invalid or missing walletAddress", http.StatusBadRequest)
			return
		}

		// Make sure toolJson is a valid ipwl.Tool
		var tool ipwl.Tool
		err = json.Unmarshal(requestData["toolJson"], &tool)
		if err != nil {
			http.Error(w, fmt.Sprintf("Invalid toolJson format: %v", err), http.StatusBadRequest)
			return
		}

		// Convert the 'tool' object back to JSON
		toolJSON, err := json.Marshal(tool)
		if err != nil {
			http.Error(w, fmt.Sprintf("Error re-marshalling tool data: %v", err), http.StatusInternalServerError)
			return
		}

		// Create a reader from the JSON data
		reader := bytes.NewReader(toolJSON)
		tempFile, err := utils.CreateAndWriteTempFile(reader, tool.Name+".json")
		if err != nil {
			http.Error(w, fmt.Sprintf("Error creating temp file: %v", err), http.StatusInternalServerError)
			return
		}
		defer os.Remove(tempFile.Name())

		cid, err := ipfs.WrapAndPinFile(tempFile.Name())
		if err != nil {
			http.Error(w, fmt.Sprintf("Error adding to IPFS: %v", err), http.StatusInternalServerError)
			return
		}

		// Store serialized Tool in DB
		toolEntry := models.Tool{
			CID:           cid,
			WalletAddress: walletAddress,
			Name:          tool.Name,
		}

		result := db.Create(&toolEntry)
		if result.Error != nil {
			if utils.IsDuplicateKeyError(result.Error) {
				http.Error(w, "A tool with the same CID already exists", http.StatusConflict)
			} else {
				http.Error(w, fmt.Sprintf("Error creating tool entity: %v", result.Error), http.StatusInternalServerError)
			}
			return
		}

		utils.SendJSONResponseWithCID(w, toolEntry.CID)
	}
}

func GetToolHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			utils.SendJSONError(w, "Only GET method is supported", http.StatusBadRequest)
			return
		}

		// Get the ID from the URL
		params := mux.Vars(r)
		cid := params["cid"]

		var tool models.Tool
		if result := db.First(&tool, "cid = ?", cid); result.Error != nil {
			http.Error(w, fmt.Sprintf("Error fetching tool: %v", result.Error), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(tool); err != nil {
			http.Error(w, "Error encoding tool to JSON", http.StatusInternalServerError)
			return
		}
	}
}

func GetToolsHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			utils.SendJSONError(w, "Only GET method is supported", http.StatusBadRequest)
			return
		}

		var tools []models.Tool
		if result := db.Find(&tools); result.Error != nil {
			http.Error(w, fmt.Sprintf("Error fetching tools: %v", result.Error), http.StatusInternalServerError)
			return
		}

		log.Println("Fetching tools from DB: ", tools)

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(tools); err != nil {
			http.Error(w, "Error encoding tools to JSON", http.StatusInternalServerError)
			return
		}
	}
}
