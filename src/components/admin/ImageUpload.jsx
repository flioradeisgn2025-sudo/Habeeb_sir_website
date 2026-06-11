import toast from 'react-hot-toast'

// Reusable drag/drop + click image picker. Stores the image as a base64 data
// URL (works offline). Also accepts a pasted URL via the optional field below.
export default function ImageUpload({ value, onChange, id, small }) {
  const readFile = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return }
    const reader = new FileReader()
    reader.onload = (ev) => onChange(ev.target.result)
    reader.readAsDataURL(file)
  }

  return (
    <div
      className={`image-upload-area ${small ? 'image-upload-area--sm' : ''}`}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); readFile(e.dataTransfer?.files?.[0]) }}
      onClick={() => document.getElementById(id).click()}
    >
      {value ? (
        <div className={`image-upload-preview ${small ? 'image-upload-preview--sm' : ''}`}>
          <img src={value} alt="Preview" />
          <button type="button" className="image-upload-remove" onClick={e => { e.stopPropagation(); onChange('') }}>
            {small ? 'Change' : 'Remove'}
          </button>
        </div>
      ) : (
        <div className="image-upload-placeholder">
          <span className="image-upload-icon">📷</span>
          <p>Click to upload or drag &amp; drop</p>
          <span className="image-upload-hint">PNG, JPG up to 5MB — or paste a URL</span>
        </div>
      )}
      <input id={id} type="file" accept="image/*" hidden onChange={e => readFile(e.target.files[0])} />
    </div>
  )
}
