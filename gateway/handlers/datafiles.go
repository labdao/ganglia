package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/mux"
	"github.com/labdao/plex/gateway/models"
	"github.com/labdao/plex/gateway/utils"
	"github.com/labdao/plex/internal/ipfs"

	"log"

	"gorm.io/gorm"
)

func AddDataFileHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		log.Println("Received request at /create-datafile")

		if err := utils.CheckRequestMethod(r, http.MethodPost); err != nil {
			utils.SendJSONError(w, err.Error(), http.StatusBadRequest)
			return
		}

		err := r.ParseMultipartForm(10 << 20)
		if err != nil {
			utils.SendJSONError(w, "Error parsing multipart form", http.StatusBadRequest)
			return
		}
		log.Println("Parsed multipart form")

		file, _, err := r.FormFile("file")
		if err != nil {
			utils.SendJSONError(w, "Error retrieving file from multipart form", http.StatusBadRequest)
			return
		}
		defer file.Close()

		walletAddress := r.FormValue("walletAddress")
		filename := r.FormValue("filename")

		log.Printf("Received file upload request for file: %s, walletAddress: %s \n", filename, walletAddress)

		tempFile, err := utils.CreateAndWriteTempFile(file, filename)
		if err != nil {
			utils.SendJSONError(w, fmt.Sprintf("Error creating temp file: %v", err), http.StatusInternalServerError)
			return
		}
		defer os.Remove(filename)

		cid, err := ipfs.WrapAndPinFile(tempFile.Name())
		if err != nil {
			utils.SendJSONError(w, "Error pinning file to IPFS", http.StatusInternalServerError)
			return
		}

		dataFile := models.DataFile{
			CID:           cid,
			WalletAddress: walletAddress,
			Filename:      filename,
			Timestamp:     time.Now(),
		}

		result := db.Create(&dataFile)
		if result.Error != nil {
			log.Println("error saving to DB")
			if utils.IsDuplicateKeyError(result.Error) {
				utils.SendJSONError(w, "A data file with the same CID already exists", http.StatusConflict)
			} else {
				utils.SendJSONError(w, fmt.Sprintf("Error saving datafile: %v", result.Error), http.StatusInternalServerError)
			}
			return
		}

		utils.SendJSONResponseWithCID(w, dataFile.CID)
	}
}

// Get a single datafile by CID
func GetDataFileHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			utils.SendJSONError(w, "Only GET method is supported", http.StatusBadRequest)
			return
		}

		vars := mux.Vars(r)
		cid := vars["cid"]
		if cid == "" {
			utils.SendJSONError(w, "Missing CID parameter", http.StatusBadRequest)
			return
		}

		var dataFile models.DataFile
		result := db.Where("cid = ?", cid).First(&dataFile)
		if result.Error != nil {
			http.Error(w, fmt.Sprintf("Error fetching datafile: %v", result.Error), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(dataFile); err != nil {
			http.Error(w, "Error encoding datafile to JSON", http.StatusInternalServerError)
			return
		}
	}
}

// List datafiles based on multiple parameters
func ListDataFilesHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			utils.SendJSONError(w, "Only GET method is supported", http.StatusBadRequest)
			return
		}

		query := db.Model(&models.DataFile{})

		if cid := r.URL.Query().Get("cid"); cid != "" {
			query = query.Where("cid = ?", cid)
		}

		if walletAddress := r.URL.Query().Get("walletAddress"); walletAddress != "" {
			query = query.Where("wallet_address = ?", walletAddress)
		}

		if filename := r.URL.Query().Get("filename"); filename != "" {
			query = query.Where("filename = ?", filename)
		}

		if tsBefore := r.URL.Query().Get("tsBefore"); tsBefore != "" {
			parsedTime, err := time.Parse(time.RFC3339, tsBefore)
			if err != nil {
				utils.SendJSONError(w, "Invalid timestamp format, use RFC3339 format", http.StatusBadRequest)
				return
			}
			query = query.Where("timestamp <= ?", parsedTime)
		}

		if tsAfter := r.URL.Query().Get("tsAfter"); tsAfter != "" {
			parsedTime, err := time.Parse(time.RFC3339, tsAfter)
			if err != nil {
				utils.SendJSONError(w, "Invalid timestamp format, use RFC3339 format", http.StatusBadRequest)
				return
			}
			query = query.Where("timestamp >= ?", parsedTime)
		}

		var dataFiles []models.DataFile
		if result := query.Find(&dataFiles); result.Error != nil {
			http.Error(w, fmt.Sprintf("Error fetching datafiles: %v", result.Error), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(dataFiles); err != nil {
			http.Error(w, "Error encoding datafiles to JSON", http.StatusInternalServerError)
			return
		}
	}
}
