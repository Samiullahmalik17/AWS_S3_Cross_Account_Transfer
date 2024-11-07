const data = {
    "files": [
      //add all the object keys here
      ],
  };
  
  // Extracting all 'key' values
  const keys = data.files.map(file => file.key);
  
  // Logging the extracted keys
  console.log(keys);
  