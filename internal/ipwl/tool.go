package ipwl

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

type ToolInput struct {
	Type    string   `json:"type"`
	Glob    []string `json:"glob"`
	Default string   `json:"string"`
}

type ToolOutput struct {
	Type string   `json:"type"`
	Glob []string `json:"glob"`
}

type Tool struct {
	Name        string                `json:"name"`
	Description string                `json:"description"`
	BaseCommand []string              `json:"baseCommand"`
	Arguments   []string              `json:"arguments"`
	DockerPull  string                `json:"dockerPull"`
	GpuBool     bool                  `json:"gpuBool"`
	Inputs      map[string]ToolInput  `json:"inputs"`
	Outputs     map[string]ToolOutput `json:"outputs"`
}

func ReadToolConfig(filePath string) (Tool, error) {
	var tool Tool

	file, err := os.Open(filePath)
	if err != nil {
		return tool, fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	bytes, err := ioutil.ReadAll(file)
	if err != nil {
		return tool, fmt.Errorf("failed to read file: %w", err)
	}

	err = json.Unmarshal(bytes, &tool)
	if err != nil {
		return tool, fmt.Errorf("failed to unmarshal JSON: %w", err)
	}

	return tool, nil
}

func toolToDockerCmd(toolConfig Tool, ioEntry IO, inputsDirPath, outputsDirPath string) (string, error) {
	arguments := strings.Join(toolConfig.Arguments, " ")

	placeholderRegex := regexp.MustCompile(`\$\((inputs\..+?(\.filepath|\.basename|\.ext))\)`)
	fileMatches := placeholderRegex.FindAllStringSubmatch(arguments, -1)

	for _, match := range fileMatches {
		placeholder := match[0]
		key := strings.TrimSuffix(strings.TrimPrefix(match[1], "inputs."), ".filepath")
		key = strings.TrimSuffix(key, ".basename")
		key = strings.TrimSuffix(key, ".ext")

		var replacement string
		input := ioEntry.Inputs[key]

		switch match[2] {
		case ".filepath":
			replacement = fmt.Sprintf("/inputs/%s", filepath.Base(input.FilePath))
		case ".basename":
			replacement = strings.TrimSuffix(filepath.Base(input.FilePath), filepath.Ext(input.FilePath))
		case ".ext":
			ext := filepath.Ext(input.FilePath)
			replacement = strings.TrimPrefix(ext, ".")
		}

		arguments = strings.Replace(arguments, placeholder, replacement, -1)
	}

	nonFilePlaceholderRegex := regexp.MustCompile(`\$\((inputs\..+?)\)`)
	nonFileMatches := nonFilePlaceholderRegex.FindAllStringSubmatch(arguments, -1)

	for _, match := range nonFileMatches {
		placeholder := match[0]
		key := strings.TrimPrefix(match[1], "inputs.")

		if input, ok := toolConfig.Inputs[key]; ok && input.Type != "File" {
			arguments = strings.Replace(arguments, placeholder, fmt.Sprintf("%v", input.Default), -1)
		}
	}

	// Add the GPU flag if GpuBool is true
	gpuFlag := ""
	if toolConfig.GpuBool {
		gpuFlag = "--gpus all"
	}

	dockerCmd := fmt.Sprintf(`docker run %s -v %s:/inputs -v %s:/outputs %s %s "%s"`, gpuFlag, inputsDirPath, outputsDirPath, toolConfig.DockerPull, strings.Join(toolConfig.BaseCommand, " "), arguments)

	return dockerCmd, nil
}
