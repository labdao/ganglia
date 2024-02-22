import os
import boto3
import time

def upload_to_s3(file_name, bucket_name, object_name=None):
    if object_name is None:
        object_name = file_name

    s3_client = boto3.client('s3')
    try:
        s3_client.upload_file(file_name, bucket_name, object_name)
        print(f"Successfully uploaded {file_name} to {bucket_name}/{object_name}")
    except Exception as e:
        print(f"Failed to upload {file_name} to {bucket_name}/{object_name}: {e}")
        raise e

def create_event_csv(checkpoint_number):
    file_name = f"checkpoint_{checkpoint_number}_event.csv"
    with open(file_name, 'w') as file:
        file.write("cycle,proposal,factor1,factor2,dim1,dim2,pdbFileName\n")
        # Hardcoded data lines for each checkpoint
        if checkpoint_number == 0:
            data_line = "1,1,9,10,5,5,example.pdb\n"
            checkpoint_pdb_filename = "example.pdb"
        elif checkpoint_number == 1:
            data_line = "2,2,20,15,11,3,design_1.pdb\n"
            checkpoint_pdb_filename = "design_1.pdb"
        elif checkpoint_number == 2:
            data_line = "3,3,10,13,9,12,BioCD202b18_aa_7fd4f_unrelaxed_rank_003_alphafold2_multimer_v3_model_2_seed_000.pdb\n"
            checkpoint_pdb_filename = "BioCD202b18_aa_7fd4f_unrelaxed_rank_003_alphafold2_multimer_v3_model_2_seed_000.pdb"
        else:
            data_line = ""
            checkpoint_pdb_filename = ""
        file.write(data_line)
    return file_name, checkpoint_pdb_filename

def main():
    job_uuid = os.getenv("JOB_UUID")
    if not job_uuid:
        raise ValueError("JOB_UUID environment variable is missing.")

    os.makedirs("/outputs", exist_ok=True)
    
    bucket_name = "app-checkpoint-bucket"
    
    # Simulate checkpoint creation and upload to S3
    for checkpoint in range(0, 3): 
        time.sleep(10)
        object_name = f"checkpoints/{job_uuid}/checkpoint_{checkpoint}"
        event_csv_filename, pdb_file_name = create_event_csv(checkpoint)
        pdb_path = f"/inputs/{pdb_file_name}"
        upload_to_s3(event_csv_filename, bucket_name, f"{object_name}/{event_csv_filename}")
        upload_to_s3(pdb_path, bucket_name, f"{object_name}/{pdb_file_name}")
        os.remove(event_csv_filename)
        print(f"Checkpoint {checkpoint} event CSV and PDB created and uploaded.")

if __name__ == "__main__":
    main()
