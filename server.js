const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;j
const UPLOAD_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

app.use(cors());
app.use(express.raw({ type: '*/*', limit: '100mb' }));

app.post('/upload', (req, res) => {
  const { uuid, chunkIndex, totalChunks, filename } = req.query;

  if (!uuid || chunkIndex === undefined || !totalChunks || !filename) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const chunkIdx = parseInt(chunkIndex);
  const total = parseInt(totalChunks);

  const tempFile = path.join(UPLOAD_DIR, `temp_${uuid}`);
  const finalFile = path.join(UPLOAD_DIR, `${uuid}${path.extname(filename)}`);

  const chunkData = req.body;

  try {
    if (chunkIdx === 0) {
      fs.writeFileSync(tempFile, chunkData);
    } else {
      fs.appendFileSync(tempFile, chunkData);
    }

    if (chunkIdx === total - 1) {
      // Final chunk → rename
      fs.renameSync(tempFile, finalFile);
      console.log(`Upload completed → ${finalFile}`);
      return res.json({ success: true, message: 'Upload complete', id: uuid });
    }

    res.json({ success: true, message: 'Chunk received' });
  } catch (err) {
    console.error('Chunk error:', err);
    res.status(500).json({ error: 'Failed to save chunk' });
  }
});

app.get('/download/:id', (req, res) => {
  const { id } = req.params;
  const files = fs.readdirSync(UPLOAD_DIR);
  const file = files.find(f => f.startsWith(id + '.'));

  if (!file) {
    return res.status(404).send('File not found');
  }

  const filePath = path.join(UPLOAD_DIR, file);
  res.download(filePath, file.replace(id, ''), (err) => {
    if (err) {
      console.error('Download error:', err);
    }
    // Optional: remove file after download (uncomment if wanted)
    // fs.unlinkSync(filePath);
  });
});

app.listen(PORT, () => {
  console.log(`Server running → http://localhost:${PORT}`);
});