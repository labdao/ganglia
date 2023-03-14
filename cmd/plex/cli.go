package plex

import (
	"fmt"
	"os"

	"github.com/labdao/plex/internal/bacalhau"
	"github.com/labdao/plex/internal/docker"
	"github.com/labdao/plex/internal/ipfs"
)

func Execute(app, inputDir, appConfigsFilePath string, layers, memory int, local, gpu, network, dry bool) {
	// validate the flags
	fmt.Println("## Validating ##")
	appConfig, err := FindAppConfig(app, appConfigsFilePath)
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}

	// creating index file
	fmt.Println("## Searching input files ##")
	identifiedFiles, err := searchDirectoryPath(inputDir, appConfig, layers)
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
	fmt.Println("Found", len(identifiedFiles), "matching files")
	for _, fileName := range identifiedFiles {
		fmt.Println(fileName)
	}

	dir, err := os.Getwd()
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}

	_, movedFiles, jobDir, err := createInputsDirectory(dir, identifiedFiles)
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
	fmt.Println("Created job directory", jobDir)

	createIndex(movedFiles, appConfig, jobDir)

	// create cid
	var cid string
	if local {
		// TODO make a local cid
		cid = ""
	} else {
		ipfsNodeUrl, err := ipfs.DeriveIpfsNodeUrl()
		if err != nil {
			fmt.Println(err)
			os.Exit(1)
		}
		cid, err = ipfs.AddDirHttp(ipfsNodeUrl, jobDir)
		if err != nil {
			fmt.Println(err)
			os.Exit(1)
		}
	}

	// create instructions
	instruction, err := CreateInstruction(app, "config/instruction_template.jsonl", cid, map[string]string{})
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}

	if local && dry {
		cmd := docker.InstructionToDockerCmd(instruction.Container, instruction.Cmd, jobDir, gpu)
		fmt.Println(cmd)
	} else if local && !dry {
		fmt.Println("## Running Job Locally via Docker ##")
		err := docker.RunDockerJob(instruction.Container, instruction.Cmd, jobDir, gpu)
		if err != nil {
			fmt.Println(err)
			os.Exit(1)
		}
	} else if !local && dry {
		cmd := bacalhau.InstructionToBacalhauCmd(instruction.InputCIDs[0], instruction.Container, instruction.Cmd, memory, gpu, network)
		fmt.Println(cmd)
	} else { // !local && !dry
		fmt.Println("## Creating Bacalhau Job ##")
		job, err := bacalhau.CreateBacalhauJob(instruction.InputCIDs[0], instruction.Container, instruction.Cmd, memory, gpu, network)
		if err != nil {
			fmt.Println(err)
			os.Exit(1)
		}
		submittedJob, err := bacalhau.SubmitBacalhauJob(job)
		if err != nil {
			fmt.Println(err)
			os.Exit(1)
		}
		fmt.Println("Bacalhau Job Id: " + submittedJob.Metadata.ID)
		results, err := bacalhau.GetBacalhauJobResults(submittedJob)
		if err != nil {
			fmt.Println(err)
			os.Exit(1)
		}
		bacalhau.DownloadBacalhauResults(jobDir, submittedJob, results)
		fmt.Println("Your job results have been downloaded to " + jobDir)
	}
}
