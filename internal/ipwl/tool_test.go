package ipwl

import (
	"reflect"
	"testing"
)

func TestReadToolConfig(t *testing.T) {
	filePath := "testdata/example_tool.json"
	expected := Tool{
		Name:        "equibind",
		Description: "Docking of small molecules to a protein",
		BaseCommand: []string{"/bin/bash", "-c"},
		Arguments: []string{
			"python main.py --protein $(inputs.protein.filepath) --small_molecule_library $(inputs.small_molecule.filepath);",
			"mv /outputs/ligands_predicted.sdf /outputs/$(inputs.protein.basename)_$(inputs.small_molecule.basename)_docked.$(inputs.small_molecule.ext);",
			"cp $(inputs.protein.filepath) /outputs/;",
			"rmdir /outputs/dummy;",
		},
		DockerPull: "ghcr.io/labdao/equibind@sha256:ae2cec63b3924774727ed1c6c8af95cf4aaea2d3f0c5acbec56478505ccb2b07",
		GpuBool:    false,
		Inputs: map[string]ToolInput{
			"protein": {
				Type: "File",
				Glob: []string{"*.pdb"},
			},
			"small_molecule": {
				Type: "File",
				Glob: []string{"*.sdf", "*.mol2"},
			},
		},
		Outputs: map[string]ToolOutput{
			"best_docked_small_molecule": {
				Type: "File",
				Glob: []string{"*_docked.sdf"},
			},
			"protein": {
				Type: "File",
				Glob: []string{"*.pdb"},
			},
		},
	}

	tool, err := ReadToolConfig(filePath)
	if err != nil {
		t.Fatalf("Error reading tool config: %v", err)
	}

	if !reflect.DeepEqual(tool, expected) {
		t.Errorf("Expected:\n%v\nGot:\n%v", expected, tool)
	}
}

func TestToolToDockerCmd(t *testing.T) {
	toolConfig := Tool{
		DockerPull:  "some_docker_pull",
		BaseCommand: []string{"some_base_command"},
		Arguments:   []string{"--protein", "$(inputs.protein.address.filepath)", "--small_molecule", "$(inputs.small_molecule.address.filepath)"},
		GpuBool:     true, // Adding the GpuBool flag
	}

	ioEntry := IO{
		Inputs: map[string]FileInput{
			"protein": {
				Class: "File",
				Address: FileAddress{
					FilePath: "testdata/binding/abl/7n9g.pdb",
				},
			},
			"small_molecule": {
				Class: "File",
				Address: FileAddress{
					FilePath: "testdata/binding/abl/ZINC000003986735.sdf",
				},
			},
		},
	}

	inputsDirPath := "testdata/binding/abl"
	outputsDirPath := "some_output_dir"

	dockerCmd, err := toolToDockerCmd(toolConfig, ioEntry, []IO{ioEntry}, inputsDirPath, outputsDirPath)
	if err != nil {
		t.Errorf("Error generating Docker command: %v", err)
	}

	// Adding the --gpus all flag to the expected command
	expectedDockerCmd := "docker run --gpus all -v testdata/binding/abl:/inputs -v some_output_dir:/outputs some_docker_pull some_base_command \"--protein /inputs/7n9g.pdb --small_molecule /inputs/ZINC000003986735.sdf\""

	if dockerCmd != expectedDockerCmd {
		t.Errorf("Expected Docker command: %s, got: %s", expectedDockerCmd, dockerCmd)
	}
}
