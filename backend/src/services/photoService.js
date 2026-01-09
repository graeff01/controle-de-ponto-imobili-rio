const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const encryption = require('../utils/encryption');

class PhotoService {

  async savePhoto(file) {
    try {
      // Lê o arquivo
      const photoBuffer = fs.readFileSync(file.path);
      
      // Gera hash SHA256 para integridade
      const hash = encryption.generateFileHash(photoBuffer);

      // Remove arquivo temporário
      fs.unlinkSync(file.path);

      return {
        data: photoBuffer,
        hash: hash,
        size: photoBuffer.length,
        mimetype: file.mimetype
      };

    } catch (error) {
      logger.error('Erro ao salvar foto', { error: error.message });
      throw error;
    }
  }

  async getPhotoBase64(photoData) {
    try {
      if (!photoData) return null;
      return photoData.toString('base64');
    } catch (error) {
      logger.error('Erro ao converter foto para base64', { error: error.message });
      return null;
    }
  }

  async validatePhotoSize(file, maxSizeBytes = 5242880) {
    if (file.size > maxSizeBytes) {
      throw new Error(`Arquivo muito grande. Tamanho máximo: MB`);
    }
    return true;
  }

  async validatePhotoType(mimetype) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(mimetype)) {
      throw new Error('Apenas imagens JPEG e PNG são permitidas');
    }
    return true;
  }
}

module.exports = new PhotoService();
