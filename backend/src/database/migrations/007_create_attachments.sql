-- Tabela de anexos (atestados, documentos)
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  
  -- Arquivo
  file_name VARCHAR(255) NOT NULL,
  file_data BYTEA NOT NULL,
  file_size_bytes INT,
  file_type VARCHAR(50),
  file_hash VARCHAR(64),
  
  -- Tipo de documento
  attachment_type VARCHAR(50),
  notes TEXT,
  
  -- Metadados
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_attachments_user_date ON attachments(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attachments_type ON attachments(attachment_type);

-- Comentários
COMMENT ON TABLE attachments IS 'Documentos anexados (atestados, comprovantes)';
COMMENT ON COLUMN attachments.attachment_type IS 'Tipos: atestado, declaracao, comprovante';
