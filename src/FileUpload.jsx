import React from 'react'

function FileUpload({ onFileUpload }) {
  function handleFileChange(event) {
    const file = event.target.files[0]

    if (!file) return

    if (!file.name.endsWith('.txt')) {
      alert('Please upload a .txt file')
      event.target.value = ''
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      onFileUpload(reader.result)
      event.target.value = ''
    }

    reader.onerror = () => {
      alert('File could not be read. Please try again.')
    }

    reader.readAsText(file)
  }

  return (
    <label className="upload-button">
      Upload .txt File
      <input
        type="file"
        accept=".txt,text/plain"
        onChange={handleFileChange}
        hidden
      />
    </label>
  )
}

export default FileUpload