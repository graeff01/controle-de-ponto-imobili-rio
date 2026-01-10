const db = require('../../config/database');
const logger = require('../../utils/logger');
const path = require('path');
const fs = require('fs').promises;

class JustificationsController {

  async create(req, res, next) {
    try {
      const { user_id, date, reason } = req.body;
      const document = req.file;
      const createdBy = req.user.id;

      if (!user_id || !date || !reason) {
        return res.status(400).json({
          success: false,
          error: 'user_id, date e reason são obrigatórios'
        });
      }

      let documentPath = null;
      let documentName = null;

      if (document) {
        // Salvar documento
        const uploadDir = path.join(__dirname, '../../../uploads/justifications');
        await fs.mkdir(uploadDir, { recursive: true });
        
        const fileName = `${Date.now()}-${document.originalname}`;
        const filePath = path.join(uploadDir, fileName);
        
        await fs.writeFile(filePath, document.buffer);
        
        documentPath = `/uploads/justifications/${fileName}`;
        documentName = document.originalname;
      }

      const result = await db.query(`
        INSERT INTO justifications (user_id, date, reason, document_path, document_name, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [user_id, date, reason, documentPath, documentName, createdBy]);

      logger.success('Justificativa criada', { id: result.rows[0].id });

      res.status(201).json({
        success: true,
        data: result.rows[0]
      });

    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const { user_id, date } = req.query;

      let query = `
        SELECT 
          j.*,
          u.nome as user_name,
          u.matricula as user_matricula,
          c.nome as created_by_name
        FROM justifications j
        JOIN users u ON j.user_id = u.id
        LEFT JOIN users c ON j.created_by = c.id
        WHERE 1=1
      `;

      const params = [];

      if (user_id) {
        params.push(user_id);
        query += ` AND j.user_id = $${params.length}`;
      }

      if (date) {
        params.push(date);
        query += ` AND j.date = $${params.length}`;
      }

      query += ` ORDER BY j.date DESC, j.created_at DESC`;

      const result = await db.query(query, params);

      res.json({
        success: true,
        data: result.rows
      });

    } catch (error) {
      next(error);
    }
  }

  async getDocument(req, res, next) {
    try {
      const { id } = req.params;

      const result = await db.query(
        'SELECT document_path, document_name FROM justifications WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0 || !result.rows[0].document_path) {
        return res.status(404).json({
          success: false,
          error: 'Documento não encontrado'
        });
      }

      const filePath = path.join(__dirname, '../../..', result.rows[0].document_path);
      res.download(filePath, result.rows[0].document_name);

    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;

      // Buscar caminho do documento
      const justification = await db.query(
        'SELECT document_path FROM justifications WHERE id = $1',
        [id]
      );

      if (justification.rows.length > 0 && justification.rows[0].document_path) {
        const filePath = path.join(__dirname, '../../..', justification.rows[0].document_path);
        try {
          await fs.unlink(filePath);
        } catch (err) {
          logger.warn('Arquivo não encontrado para deletar', { filePath });
        }
      }

      await db.query('DELETE FROM justifications WHERE id = $1', [id]);

      res.json({
        success: true,
        message: 'Justificativa deletada com sucesso'
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new JustificationsController();