-- Tabela de logs de emails enviados
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  email_type VARCHAR(50) NOT NULL,
  
  -- Status de envio
  status VARCHAR(20) NOT NULL,
  sent_at TIMESTAMP,
  error_message TEXT,
  
  -- Referências
  user_id UUID,
  related_id UUID,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at DESC);

-- Comentários
COMMENT ON TABLE email_logs IS 'Log de emails enviados pelo sistema';
COMMENT ON COLUMN email_logs.email_type IS 'Tipos: alert, report, notification';
COMMENT ON COLUMN email_logs.status IS 'Status: sent, failed, pending';
