import subprocess
import os
import re
import logging

from .base_generator import BaseGenerator

class RFdiffusionProteinMPNNGenerator(BaseGenerator):

    def _generate_contig(self, permissibility_vector, target, starting_target_residue=None, end_target_residue=None):
        if starting_target_residue is None:
            starting_target_residue = 1
        if end_target_residue is None:
            end_target_residue = len(target)
        
        # Initialize variables
        permissibility_contig = ''
        current_group = ''
        alphabet = 'LAGVSERTIDPKQNFYMHWC'
        position = 0  # Position within the permissibility_vector
        
        # Iterate over the squeezed_permissibility_vector to form groups
        for char in permissibility_vector:
            if char in alphabet:
                if current_group == '' or current_group[-1] in alphabet:
                    current_group += char  # Continue the current alphabet group
                elif current_group[-1]=='X' or current_group[-1]=='*':
                    permissibility_contig += f'{len(current_group)}/'
                    current_group = char
            elif char=='X' or char=='*':  # char is 'X'
                if current_group == '' or current_group[-1] == 'X' or current_group[-1] == '*':
                    current_group += char  # Continue the current X group
                elif current_group[-1] in alphabet:
                    permissibility_contig += f'B{position-len(current_group)+1}-{position}/'
                    current_group = char
            elif char=='-':
                if current_group!='' and current_group[-1] in alphabet:
                    permissibility_contig += f'B{position-len(current_group)+1}-{position}/'
                    current_group = ''
                elif current_group!='' and (current_group[-1]=='X' or current_group[-1]=='*'):
                    permissibility_contig += f'{len(current_group)}/'
                    current_group = ''

            position += 1
        
        # Add the last group to the contig
        if current_group:
            if current_group[-1] == 'X' or current_group[-1] == '*':
                permissibility_contig += f'{len(current_group)}/'  # X group
            else:
                permissibility_contig += f'B{position-len(current_group)+1}-{position}/'  # Alphabet group
        
        # Remove the trailing '/' if it exists
        if permissibility_contig.endswith('/'):
            permissibility_contig = permissibility_contig[:-1]
        
        # Construct the final contig string
        contig = f'A{starting_target_residue}-{end_target_residue}/0 {permissibility_contig}'
        
        return contig
    
    def _reinsert_deletions(self, modified_seq, permissibility_vector):
        if len(modified_seq) != len(permissibility_vector.replace('-', '')): # check if lengths match when '-' is removed from action mask
            raise ValueError("Length of modified_seq does not match the length of permissibility_vector without '-' characters.")

        seq_with_deletions = ''
        modified_seq_index = 0

        # Iterate over the permissibility_vector and construct seq_with_deletions
        for char in permissibility_vector:
            if char == '-':
                seq_with_deletions += '-'
            else:
                seq_with_deletions += modified_seq[modified_seq_index]
                modified_seq_index += 1

        return seq_with_deletions

    def generate(self, args):

        evo_cycle = args.evo_cycle
        sequence = args.sequence
        permissibility_vector = args.permissibility_vector
        df = args.df
        outputs_directory = args.outputs_directory
        generator_name = args.generator_name
        target = args.target
        num_designs = args.num_designs
        num_seqs =args.num_seqs 

        generator_directory = os.path.join(outputs_directory, generator_name)
        if not os.path.exists(generator_directory):
            os.makedirs(generator_directory, exist_ok=True)
        logging.info(f"Running {generator_name}")

        if 'X' in permissibility_vector or '*' in permissibility_vector: # check if there is any diffusion to be done

            logging.info(f"diffusing...")

            # logging.info(f"permissibility vector, {permissibility_vector}")
            contig = self._generate_contig(permissibility_vector, target, starting_target_residue=None, end_target_residue=None)
            logging.info(f"diffusion contig, {contig}")

            # Set up the environment for the subprocess - required so that RFdiffussion can find its proper packages
            env = os.environ.copy()
            env['PYTHONPATH'] = "/app/RFdiffusion:" + env.get('PYTHONPATH', '')

            command = [
                'python', 'RFdiffusion/scripts/run_inference.py',
                f'inference.output_prefix={os.path.join(generator_directory, f"design_cycle_{evo_cycle}_motifscaffolding")}',
                'inference.model_directory_path=RFdiffusion/models',
                f'inference.input_pdb={df["absolute pdb path"].iloc[0]}',
                f'inference.num_designs={num_designs}',
                f'contigmap.contigs={[contig]}'
            ]

            result = subprocess.run(command, capture_output=True, text=True, env=env)

            # Check if the command was successful
            if result.returncode == 0:
                logging.info(f"#Inference script ran successfully")
                logging.info(result.stdout)
            else:
                logging.info(f"#Error running inference script")
                logging.info(result.stderr)
                    
            logging.info(f"Running MPNN")

            # Activate the conda environment 'mlfold'
            subprocess.run(['conda', 'activate', 'mlfold'], shell=True) # TD: I think this can be removed - check this.


            # Loop over all PDB files starting with 'design_cycle_{evo_cycle}_motifscaffolding'
            for pdb_file in os.listdir(generator_directory):
                if pdb_file.startswith(f"design_cycle_{evo_cycle}_motifscaffolding") and pdb_file.endswith(".pdb"):
                    path_to_PDB = os.path.join(generator_directory, pdb_file)
                    output_dir = generator_directory
                    chains_to_design = 'A'

                    # Create the output directory if it doesn't exist
                    os.makedirs(output_dir, exist_ok=True)

                    logging.info(f"pdb path, {path_to_PDB}")

                    command = [
                        'python', 'ProteinMPNN/protein_mpnn_run.py',
                        '--pdb_path', path_to_PDB,
                        '--pdb_path_chains', chains_to_design,
                        '--out_folder', output_dir,
                        '--num_seq_per_target', str(num_seqs),
                        '--sampling_temp', '0.1',
                        '--seed', '37',
                        '--batch_size', '1'
                    ]

                    # Run the command
                    subprocess.run(command, capture_output=True, text=True)

            # Initialize variables to keep track of the highest score and its associated sequence across all fasta files
            highest_overall_score = None
            highest_overall_score_sequence = None

            # Define the directory where fasta files are located
            fasta_directory = os.path.join(generator_directory, "seqs")

            # Loop over all fasta files in the fasta_directory
            for fasta_file in os.listdir(fasta_directory):
                if fasta_file.startswith(f"design_cycle_{evo_cycle}_motifscaffolding") and fasta_file.endswith(".fa"):
                    fasta_file_path = os.path.join(fasta_directory, fasta_file)
                            
                    # Read the contents of the fasta file
                    with open(fasta_file_path, 'r') as file:
                        lines = file.readlines()

                    start_line = 3
                    # Iterate over the lines in the fasta file, starting from start_line
                    for i in range(start_line, len(lines), 2):
                        header = lines[i - 1]
                        sequence = lines[i].strip()
                                        
                        # Extract the score from the header
                        match = re.search(r'score=(\d+\.\d+)', header)
                        if match:
                            score = float(match.group(1))
                            # If this is the first score or a higher score than the current highest, update the highest score and sequence
                            if highest_overall_score is None or score > highest_overall_score:
                                highest_overall_score = score
                                highest_overall_score_sequence = sequence

            # Check if a highest scoring sequence was found across all fasta files
            if highest_overall_score_sequence:
                logging.info(f"Highest ProteinMPNN-scoring sequence: {highest_overall_score_sequence}")
                    
            # insert the deletions back into the sequence:
            modified_seq = highest_overall_score_sequence
            modified_seq = self._reinsert_deletions(modified_seq, permissibility_vector)

        else:
            modified_seq = sequence

        modified_seq = list(modified_seq) # insert the new deletions - TD: remind yourself why this is necessary!
        for i, char in enumerate(permissibility_vector):
            if char=='-':
                if modified_seq[i]!='-':
                    logging.info(f"deleting residue")
                    modified_seq[i] = '-'        

        return ''.join(modified_seq), ''.join(args.permissibility_vector)