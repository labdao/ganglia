package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/labdao/plex/gateway/models"
	"github.com/labdao/plex/gateway/utils"
	"github.com/labdao/plex/internal/web3"

	"gorm.io/gorm"
)

func AddUserHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := utils.CheckRequestMethod(r, http.MethodPost); err != nil {
			utils.SendJSONError(w, "Only POST method is supported", http.StatusBadRequest)
			fmt.Println("Received non-POST request for /user endpoint.")
			return
		}

		var requestData struct {
			WalletAddress string `json:"walletAddress"`
			Username      string `json:"username"`
		}

		if err := utils.ReadRequestBody(r, &requestData); err != nil {
			utils.SendJSONError(w, "Error parsing request body", http.StatusBadRequest)
			fmt.Println("Error decoding request body:", err)
			return
		}

		fmt.Printf("Received request to create user: WalletAddress: %s, Username: %s,\n", requestData.WalletAddress, requestData.Username)

		isValidAddress := web3.IsValidEthereumAddress(requestData.WalletAddress)
		if !isValidAddress {
			utils.SendJSONError(w, "Invalid wallet address", http.StatusBadRequest)
			fmt.Println("Invalid wallet address:", requestData.WalletAddress)
			return
		}

		var existingUser models.User
		if err := db.Where("wallet_address = ? AND username = ?", requestData.WalletAddress, requestData.Username).First(&existingUser).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				// User does not exist, create new user
				newUser := models.User{
					WalletAddress: requestData.WalletAddress,
					Username:      requestData.Username,
				}
				if result := db.Create(&newUser); result.Error != nil {
					utils.SendJSONError(w, fmt.Sprintf("Error creating user: %v", result.Error), http.StatusInternalServerError)
					fmt.Println("Error creating user in database:", result.Error)
					return
				}
				fmt.Printf("Successfully created user with WalletAddress: %s, Username: %s\n", newUser.WalletAddress, newUser.Username)
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusCreated)
				json.NewEncoder(w).Encode(newUser)
			} else {
				// Some other error occurred during the query
				utils.SendJSONError(w, "Database error", http.StatusInternalServerError)
				fmt.Println("Database error:", err)
			}
		} else {
			// User with given wallet address and username already exists, return that user
			fmt.Printf("User already exists with WalletAddress: %s, Username: %s\n", existingUser.WalletAddress, existingUser.Username)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(existingUser)
		}
	}
}
