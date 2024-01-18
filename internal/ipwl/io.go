package ipwl

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
)

type ToolInfo struct {
	Name string `json:"name"`
	IPFS string `json:"ipfs"`
}

type IO struct {
	Tool          ToolInfo               `json:"tool"`
	Inputs        map[string]interface{} `json:"inputs"`
	Outputs       map[string]interface{} `json:"outputs"`
	State         string                 `json:"state"`
	ErrMsg        string                 `json:"errMsg"`
	UserID        string                 `json:"userId"`
	BacalhauJobId string                 `json:"bacalhauJobId"`
}

func ReadIOList(filePath string) ([]IO, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	data, err := ioutil.ReadAll(file)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	var ioLibrary []IO
	err = json.Unmarshal(data, &ioLibrary)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal JSON: %w", err)
	}

	return ioLibrary, nil
}

func WriteIOList(ioJsonPath string, ioList []IO) error {
	file, err := os.OpenFile(ioJsonPath, os.O_WRONLY|os.O_TRUNC|os.O_CREATE, 0644)
	if err != nil {
		return fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")

	err = encoder.Encode(ioList)
	if err != nil {
		return fmt.Errorf("failed to encode IO list: %w", err)
	}

	return nil
}
