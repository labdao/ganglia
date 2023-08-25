export const saveDataFileToServer = async (
    file: File,
    metadata: { [key: string]: any }
  ): Promise<{ filename: string, cid: string }> => {
    const formData = new FormData();
    
    // Append file to form data
    formData.append('dataFile', file);
  
    // Append additional metadata if required
    for (const key in metadata) {
      formData.append(key, metadata[key]);
    }
  
    const response = await fetch('http://localhost:8080/datafile', {
      method: 'POST',
      // Notice we are not setting the Content-Type header.
      // The browser will set it to `multipart/form-data` and append the appropriate boundary for FormData.
      body: formData,
    })
  
    if (!response.ok) {
      let errorMsg = 'An error occurred while uploading the data file'
      try {
        const errorResult = await response.json()
        errorMsg = errorResult.message || errorMsg;
      } catch (e) {
        // Parsing JSON failed, retain the default error message.
      }
      console.log('errorMsg', errorMsg)
      throw new Error(errorMsg)
    }
  
    const result = await response.json()
    console.log('result', result)
    return result;
  }
  