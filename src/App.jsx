import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useState, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import FileUpload from './FileUpload'
import './App.css'

const API_BASE = import.meta.env.VITE_API_URL || '/api'
const API_URL = `${API_BASE}/documents`

function App() {
  const [documents, setDocuments] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeId, setActiveId] = useState(null)
  const [loading, setLoading] = useState(true)
    const [users, setUsers] = useState([])
  const [currentUser, setCurrentUser] = useState(
    () => localStorage.getItem('currentUser') || 'eman'
  )
  const currentUserRef = useRef(currentUser)

  useEffect(() => {
    currentUserRef.current = currentUser
    localStorage.setItem('currentUser', currentUser)
  }, [currentUser])

  // fetch wrapper: har request ke saath x-user-id header jata hai
  function api(path, options = {}) {
    return fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUserRef.current,
        ...(options.headers || {}),
      },
    })
  }
const [darkMode, setDarkMode] = useState(
  () => localStorage.getItem('darkMode') === 'true'
)
useEffect(() => {
  localStorage.setItem('darkMode', darkMode)
}, [darkMode])
  const [saveStatus, setSaveStatus] = useState('Loading documents...')
  const saveTimer = useRef(null)
  const activeIdRef = useRef(null)
  const editorUpdateRef = useRef(false)

  const activeDoc = documents.find(
    (doc) => doc._id === activeId
  ) || documents[0]
    const isOwner = activeDoc?.owner === currentUser
    

  useEffect(() => {
    activeIdRef.current = activeId
  }, [activeId])
    // Demo users ki list (user switcher ke liye)
  useEffect(() => {
    fetch(`${API_BASE}/users`)
      .then((response) => response.json())
      .then(setUsers)
      .catch((error) => console.error(error))
  }, [])

  // Load documents from MongoDB
  useEffect(() => {
    let cancelled = false

    async function loadDocuments() {
      try {
          const response = await api('')

        if (!response.ok) {
          throw new Error('Could not load documents')
        }

        const data = await response.json()

        if (cancelled) return

        if (data.length > 0) {
          setDocuments(data)
          setActiveId(data[0]._id)
        } else {
          const createResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: 'Welcome Document',
              content:
                '<p>Welcome to your document editor!</p><p>Start writing here...</p>',
            }),
          })

          if (!createResponse.ok) {
            throw new Error('Could not create welcome document')
          }

          const welcomeDoc = await createResponse.json()

          if (!cancelled) {
            setDocuments([welcomeDoc])
            setActiveId(welcomeDoc._id)
          }
        }

        if (!cancelled) setSaveStatus('Connected to database')
      } catch (error) {
        console.error(error)
        if (!cancelled) {
          setSaveStatus('Connection failed — check backend')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadDocuments()

    return () => {
      cancelled = true
    }
  }, [])

  const editor = useEditor({
        extensions: [StarterKit.configure({ underline: false }), Underline],
    content: activeDoc?.content || '',
    onUpdate: ({ editor }) => {
      if (editorUpdateRef.current) return

      const content = editor.getHTML()
      const id = activeIdRef.current

      setDocuments((current) =>
        current.map((doc) =>
          doc._id === id ? { ...doc, content } : doc
        )
      )

      setSaveStatus('Unsaved changes')

      // Debounce saves while the user is typing
      clearTimeout(saveTimer.current)

      saveTimer.current = setTimeout(async () => {
        try {
          const doc = documentsRef.current.find(
            (item) => item._id === id
          )

          if (!doc) return

                   const response = await api(`/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ content }),
          })

          if (!response.ok) throw new Error('Save failed')
          setSaveStatus('Saved to MongoDB')
        } catch (error) {
          console.error(error)
          setSaveStatus('Save failed')
        }
      }, 700)
    },
    editorProps: {
      attributes: {
        class: 'tiptap-content',
        'aria-label': 'Document content',
      },
    },
  })

  const documentsRef = useRef(documents)

  useEffect(() => {
    documentsRef.current = documents
  }, [documents])

  useEffect(() => {
    return () => clearTimeout(saveTimer.current)
  }, [])

  // Update editor when switching documents
  useEffect(() => {
    if (!editor || !activeDoc) return

    if (editor.getHTML() !== (activeDoc.content || '')) {
      editorUpdateRef.current = true
      editor.commands.setContent(activeDoc.content || '')
      editorUpdateRef.current = false
    }
  }, [activeId, editor, activeDoc?._id])

  const editorText = editor?.getText() || ''
  const wordCount = editorText.trim()
    ? editorText.trim().split(/\s+/).length
    : 0
  const characterCount = editorText.length

  function escapeHTML(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  function handleFileUpload(text) {
    if (!editor) return

    const content = text
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line) => `<p>${escapeHTML(line) || '<br>'}</p>`)
      .join('')

    editor.commands.setContent(content)
  }

  function downloadDocument() {
    if (!editor || !activeDoc) return

    const blob = new Blob([editor.getText()], {
      type: 'text/plain;charset=utf-8',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${activeDoc.title || 'document'}.txt`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }


async function downloadPDF() {
  if (!editor || !activeDoc) return;

  const paper = document.querySelector(".editor-paper");

  if (!paper) {
    alert("Editor content not found.");
    return;
  }

  try {
    const canvas = await html2canvas(paper, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;

    const imageWidth = pageWidth - margin * 2;
    const imageHeight =
      (canvas.height * imageWidth) / canvas.width;
    const usableHeight = pageHeight - margin * 2;

    const image = canvas.toDataURL("image/png");
    let remainingHeight = imageHeight;
    let position = margin;

    pdf.addImage(
      image,
      "PNG",
      margin,
      position,
      imageWidth,
      imageHeight
    );

    remainingHeight -= usableHeight;

    while (remainingHeight > 0) {
      pdf.addPage();
      position = margin - (imageHeight - remainingHeight);

      pdf.addImage(
        image,
        "PNG",
        margin,
        position,
        imageWidth,
        imageHeight
      );

      remainingHeight -= usableHeight;
    }

    const title = activeDoc.title || "Untitled Document";
    const safeTitle = title.replace(/[\\/:*?"<>|]/g, "-");

    pdf.save(`${safeTitle}.pdf`);
  } catch (error) {
    console.error("PDF export failed:", error);
    alert("PDF download nahi ho saki. Dobara try karo.");
  }
}


  async function createDocument() {
    try {
         const response = await api('', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Untitled Document',
          content: '<p></p>',
        }),
      })

      if (!response.ok) throw new Error('Could not create document')

      const newDoc = await response.json()
      setDocuments((current) => [...current, newDoc])
      setActiveId(newDoc._id)
      setSaveStatus('Saved to MongoDB')
    } catch (error) {
      console.error(error)
      setSaveStatus('Could not create document')
    }
  }

  async function renameDocument() {
    if (!activeDoc) return

    const title = prompt('Enter document name:', activeDoc.title)
    if (!title?.trim()) return

    const updatedDoc = { ...activeDoc, title: title.trim() }

    try {
        const response = await api(`/${activeDoc._id}`, {
        method: 'PUT',
        body: JSON.stringify({ title: updatedDoc.title }),
      })
      if (!response.ok) throw new Error('Rename failed')

      const savedDoc = await response.json()
      setDocuments((current) =>
        current.map((doc) =>
          doc._id === savedDoc._id ? savedDoc : doc
        )
      )
      setSaveStatus('Saved to MongoDB')
    } catch (error) {
      console.error(error)
      setSaveStatus('Rename failed')
    }
  }

  async function deleteDocument() {
    if (!activeDoc) return
    if (!confirm(`Delete "${activeDoc.title}"?`)) return

    try {
           const response = await api(`/${activeDoc._id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Delete failed')

      const remaining = documents.filter(
        (doc) => doc._id !== activeDoc._id
      )

      if (remaining.length > 0) {
        setDocuments(remaining)
        setActiveId(remaining[0]._id)
      } else {
              const createResponse = await api('', {
          method: 'POST',
          body: JSON.stringify({
            title: 'Welcome Document',
            content: '<p></p>',
          }),
        })

        if (!createResponse.ok) {
          throw new Error('Could not create replacement document')
        }

        const replacement = await createResponse.json()
        setDocuments([replacement])
        setActiveId(replacement._id)
      }

      setSaveStatus('Saved to MongoDB')
    } catch (error) {
      console.error(error)
      setSaveStatus('Delete failed')
    }
  }
    async function shareDocument() {
    if (!activeDoc || !isOwner) return

    const others = users
      .filter((user) => user.id !== currentUser)
      .map((user) => user.id)
      .join(' / ')

    const target = prompt(`Share with (${others}):`)
    if (!target?.trim()) return

    try {
      const response = await api(`/${activeDoc._id}/share`, {
        method: 'POST',
        body: JSON.stringify({ userId: target.trim().toLowerCase() }),
      })
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Share failed')

      setDocuments((current) =>
        current.map((doc) => (doc._id === data._id ? data : doc))
      )
      setSaveStatus(`Shared with ${target.trim().toLowerCase()}`)
    } catch (error) {
      console.error(error)
      setSaveStatus(error.message)
    }
  }
    function switchUser(userId) {
    clearTimeout(saveTimer.current)
    setDocuments([])
    setActiveId(null)
    setCurrentUser(userId)
  }

  function chooseDocument(id) {
    setActiveId(id)
  }
    const filteredDocs = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const myDocs = filteredDocs.filter((doc) => doc.owner === currentUser)
  const sharedDocs = filteredDocs.filter((doc) => doc.owner !== currentUser)

  if (loading) {
    return <div className="app"><main className="main">Loading documents...</main></div>
  }

  return (
    <div className={`app ${darkMode ? 'dark-mode' : ''}`}>
      <aside className="sidebar">
        <h2>PaperSpace</h2>
        <p className="muted">YOUR WORKSPACE</p>
                <div className="user-switcher">
          <label htmlFor="user-select">Demo user</label>
          <select
            id="user-select"
            value={currentUser}
            onChange={(event) => switchUser(event.target.value)}
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        <button className="new-button" onClick={createDocument}>
          + New Document
        </button>

                <input
          className="document-search"
          type="text"
          placeholder="Search documents..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />

        <p className="section-label">MY DOCUMENTS</p>

        {myDocs.length === 0 && <p className="muted">No documents</p>}
        {myDocs.map((doc) => (
          <button
            key={doc._id}
            className={`doc-item ${activeId === doc._id ? 'active' : ''}`}
            onClick={() => chooseDocument(doc._id)}
            title={doc.title}
          >
            📄 {doc.title}
          </button>
        ))}

        <p className="section-label">SHARED WITH ME</p>

        {sharedDocs.length === 0 && <p className="muted">Nothing shared yet</p>}
        {sharedDocs.map((doc) => (
          <button
            key={doc._id}
            className={`doc-item ${activeId === doc._id ? 'active' : ''}`}
            onClick={() => chooseDocument(doc._id)}
            title={`Shared by ${doc.owner}`}
          >
            👥 {doc.title}
          </button>
        ))}
         

       </aside>

      <main className="main">
        <header className="topbar">
          <span className="breadcrumb">
            Workspace / {activeDoc?.title}
          </span>

          <div className="header-actions">
            <span className="save-status">
              <span className="status-dot" />
              {saveStatus}
            </span>
            
<button onClick={() => setDarkMode(!darkMode)}>
  {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
</button>


                        {isOwner && (
              <>
                <button onClick={shareDocument}>Share</button>
                <button onClick={renameDocument}>Rename</button>
                <button className="delete-button" onClick={deleteDocument}>
                  Delete
                </button>
              </>
            )}
            {activeDoc && !isOwner && (
              <span className="owner-label">
                Shared by {activeDoc.owner}
              </span>
            )}
          </div>
        </header>

        <section className="editor">
          <div className="editor-heading">
            <p className="muted">DOCUMENT EDITOR</p>
            <h1>{activeDoc?.title}</h1>
          </div>

          <div className="file-upload-area">
            <FileUpload onFileUpload={handleFileUpload} />
            <button
              className="download-button"
              onClick={downloadDocument}
              disabled={!editor || !activeDoc}
            >
              Download .txt
            </button>
          </div>
          <button
  className="download-button"
  onClick={downloadPDF}
  disabled={!editor || !activeDoc}
>
  Download PDF
</button>

          <div className="toolbar">
            <button
              className={editor?.isActive('bold') ? 'tool active-tool' : 'tool'}
              onClick={() => editor?.chain().focus().toggleBold().run()}
              disabled={!editor}
              title="Bold"
            ><b>B</b></button>

            <button
              className={editor?.isActive('italic') ? 'tool active-tool' : 'tool'}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              disabled={!editor}
              title="Italic"
            ><i>I</i></button>

            <button
              className={editor?.isActive('underline') ? 'tool active-tool' : 'tool'}
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              disabled={!editor}
              title="Underline"
            ><u>U</u></button>

            <span className="toolbar-divider" />

            <button
              className={editor?.isActive('heading', { level: 1 }) ? 'tool active-tool' : 'tool'}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
              disabled={!editor}
              title="Heading 1"
            >H1</button>

            <button
              className={editor?.isActive('heading', { level: 2 }) ? 'tool active-tool' : 'tool'}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              disabled={!editor}
              title="Heading 2"
            >H2</button>

            <button
              className={editor?.isActive('bulletList') ? 'tool active-tool' : 'tool'}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              disabled={!editor}
              title="Bullet list"
            >• List</button>

            <button
              className={editor?.isActive('orderedList') ? 'tool active-tool' : 'tool'}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              disabled={!editor}
              title="Numbered list"
            >1. List</button>
          </div>

          <div className="editor-paper">
            <EditorContent editor={editor} />
          </div>

          <div className="document-stats">
            <span>Words: {wordCount}</span>
            <span>Characters: {characterCount}</span>
          </div>

          <p className="muted">
            Documents are saved to MongoDB when connected.
          </p>
        </section>
      </main>
    </div>
  )
}

export default App
