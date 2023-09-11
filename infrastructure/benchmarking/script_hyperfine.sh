#!/bin/bash

# Doing 100 runs of Equibind
hyperfine -m 100 --export-csv /tmp/equibind.csv -n 'equibind' "plex init -t tools/equibind.json -i '{\"protein\": [\"testdata/binding/6d08_protein_processed.pdb\"], \"small_molecule\": [\"testdata/binding/6d08_ligand.sdf\"]}' --scatteringMethod=dotProduct --autoRun=true -a test -a benchmarking"

# Doing 100 runs of diffdock
hyperfine -m 100 --export-csv /tmp/diffdock.csv -n 'diffdock' "plex init -t tools/diffdock.json -i '{\"protein\": [\"testdata/binding/6d08_protein_processed.pdb\"], \"small_molecule\": [\"testdata/binding/6d08_ligand.sdf\"]}' --scatteringMethod=dotProduct --autoRun=true -a test -a benchmarking"

# Doing 100 runs of each colabfold with specific input file
hyperfine -m 100 --export-csv /tmp/colabfold.csv -L input histatin-3,tax1-binding_protein_3,c-reactive_protein,gap_junction_protein,phospholipid_glycerol_acyltransferase_domain-containing_protein,rims-binding_protein_3b,dna_helicase,hect-type_e3_ubiquitin_transferase -n "colabfold-{input}" "plex init -t tools/colabfold-mini.json -i {\"sequence\": [\"testdata/folding/{input}.fasta\"]} --scatteringMethod=dotProduct --autoRun=true -a test -a benchmarking"

# Doing 100 runs of RFdiffusion colabdesign with small,medium and large sizes
hyperfine -m 100 --export-csv /tmp/rfdiffusion-colabdesign.csv -L size small,medium,large -n "rfdiffusion-colabdesign_{size}" "plex init -t tools/colabdesign/_colabdesign-dev.json -i '{\"protein\": [\"tools/colabdesign/6vja_stripped.pdb\"], \"config\": [\"tools/colabdesign/{size}-config.yaml\"]}' --scatteringMethod=dotProduct --autoRun=true -a test -a benchmarking"
