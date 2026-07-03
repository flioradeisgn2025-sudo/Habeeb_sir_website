import toast from 'react-hot-toast'

// Downscale + recompress an image so the base64 payload stays small enough to
// send to the API (serverless request bodies are capped at a few MB).
const MAX_DIMENSION = 1200

function compressImage(dataUrl, fileType, done) {
  const img = new Image()
  img.onload = () => {
    let { width, height } = img
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / Math.max(width, height)
      width = Math.round(width * scale)
      height = Math.round(height * scale)
    }
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d').drawImage(img, 0, 0, width, height)
    // Keep PNG for images that may need transparency, JPEG for everything else
    const output = fileType === 'image/png'
      ? canvas.toDataURL('image/png')
      : canvas.toDataURL('image/jpeg', 0.82)
    // If compression somehow made it bigger, keep the original
    done(output.length < dataUrl.length ? output : dataUrl)
  }
  img.onerror = () => done(dataUrl)
  img.src = dataUrl
}

// Reusable drag/drop + click image picker. Stores the image as a base64 data
// URL (works offline). Also accepts a pasted URL via the optional field below.
export default function ImageUpload({ value, onChange, id, small }) {
  const readFile = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return }
    const reader = new FileReader()
    reader.onload = (ev) => compressImage(ev.target.result, file.type, onChange)
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
