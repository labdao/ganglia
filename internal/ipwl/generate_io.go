package ipwl

import "path/filepath"

func findMatchingFiles(inputDir string, tool Tool) (map[string][]string, error) {
	inputFilepaths := make(map[string][]string)

	for inputName, inputProps := range tool.Inputs {
		inputData := inputProps.(map[string]interface{})
		inputType, ok := inputData["type"].(string)
		if !ok || inputType != "File" {
			continue
		}

		globPatterns := inputData["glob"].([]interface{})
		for _, globPattern := range globPatterns {
			matches, err := filepath.Glob(filepath.Join(inputDir, globPattern.(string)))
			if err != nil {
				return nil, err
			}

			inputFilepaths[inputName] = append(inputFilepaths[inputName], matches...)
		}
	}

	return inputFilepaths, nil
}

func generateCombinationsRecursive(keys []string, values map[string][]string, index int, combination map[string]string, combinations *[]map[string]string) {
	if index == len(keys) {
		newCombination := make(map[string]string)
		for key, value := range combination {
			newCombination[key] = value
		}
		*combinations = append(*combinations, newCombination)
		return
	}

	key := keys[index]
	for _, value := range values[key] {
		combination[key] = value
		generateCombinationsRecursive(keys, values, index+1, combination, combinations)
	}
}

func generateInputCombinations(inputFilepaths map[string][]string) []map[string]string {
	var combinations []map[string]string
	keys := make([]string, 0, len(inputFilepaths))

	for key := range inputFilepaths {
		keys = append(keys, key)
	}

	generateCombinationsRecursive(keys, inputFilepaths, 0, make(map[string]string), &combinations)

	return combinations
}

func createIOEntries(tool Tool, inputCombinations []map[string]string) []IO {
	var ioData []IO

	for _, combination := range inputCombinations {
		ioEntry := IO{
			Tool:    tool.Name,
			State:   "created",
			Inputs:  map[string]interface{}{},
			Outputs: map[string]interface{}{},
		}

		for inputName, filepath := range combination {
			ioEntry.Inputs[inputName] = map[string]interface{}{
				"class":    "File",
				"filepath": filepath,
			}
		}

		for outputName, outputProps := range tool.Outputs {
			outputData := outputProps.(map[string]interface{})
			outputType, ok := outputData["type"].(string)
			if !ok || outputType != "File" {
				continue
			}

			ioEntry.Outputs[outputName] = map[string]interface{}{
				"class": "File",
			}
		}

		ioData = append(ioData, ioEntry)
	}

	return ioData
}

func createIOJson(inputDir string, tool Tool) ([]IO, error) {
	inputFilepaths, err := findMatchingFiles(inputDir, tool)
	if err != nil {
		return nil, err
	}

	inputCombinations := generateInputCombinations(inputFilepaths)
	ioData := createIOEntries(tool, inputCombinations)

	return ioData, nil
}
