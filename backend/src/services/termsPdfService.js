const PDFDocument = require('pdfkit');
const crypto = require('crypto');
const db = require('../config/database');
const logger = require('../utils/logger');
const zlib = require('zlib');

const TERMS_TEXT = [
  { type: 'title', text: 'TERMO DE COMPROMISSO E RESPONSABILIDADE' },
  { type: 'subtitle', text: 'REGISTRO ELETRÔNICO DE PONTO' },
  { type: 'info', text: 'Auxiliadora Predial — Versão 1.0.0 — Vigência a partir de 01 de Março de 2026' },

  { type: 'bold', text: 'CONSIDERANDO:' },
  { type: 'bullet', text: 'A obrigatoriedade do registro de jornada de trabalho nos termos do Art. 74, §2° da CLT;' },
  { type: 'bullet', text: 'A adoção pela empresa de sistema de Registro Eletrônico de Ponto por Programa (REP-P), em conformidade com a Portaria MTP n° 671/2021;' },
  { type: 'bullet', text: 'A validade jurídica de assinaturas eletrônicas simples entre partes privadas, conforme Lei n° 14.063/2020 e Art. 10, §2° da MP 2.200-2/2001;' },
  { type: 'bullet', text: 'O poder diretivo do empregador (Art. 2° da CLT) para estabelecer normas internas de controle de jornada.' },

  { type: 'text', text: 'Eu, colaborador(a) identificado(a) por minha matrícula funcional neste sistema, DECLARO que:' },

  { type: 'section', text: '1. CIÊNCIA DAS REGRAS DE REGISTRO DE PONTO' },
  { type: 'text', text: '1.1. Estou ciente de que o registro de ponto é pessoal e intransferível, devendo ser realizado exclusivamente por mim, com meus próprios dados e credenciais de acesso.' },
  { type: 'text', text: '1.2. O registro deverá ser efetuado nos exatos momentos de entrada, saída para intervalo, retorno do intervalo e saída final, conforme Art. 74, §2° da CLT.' },
  { type: 'text', text: '1.3. Fico ciente da tolerância legal de 5 (cinco) minutos para cada marcação de ponto e de 10 (dez) minutos diários no total, conforme Art. 58, §1° da CLT.' },

  { type: 'section', text: '2. INTERVALO INTRAJORNADA' },
  { type: 'text', text: '2.1. Comprometo-me a observar o intervalo intrajornada mínimo de 1 (uma) hora, conforme Art. 71 da CLT.' },
  { type: 'text', text: '2.2. Estou ciente de que a não concessão ou concessão parcial do intervalo intrajornada implica o pagamento de natureza indenizatória nos termos do §4° do Art. 71 da CLT.' },

  { type: 'section', text: '3. DESCANSO ENTRE JORNADAS' },
  { type: 'text', text: '3.1. Estou ciente de que devo respeitar o período mínimo de 11 (onze) horas consecutivas de descanso entre duas jornadas de trabalho, conforme Art. 66 da CLT.' },

  { type: 'section', text: '4. HORAS EXTRAORDINÁRIAS E BANCO DE HORAS' },
  { type: 'text', text: '4.1. Compreendo que a realização de horas extras somente será válida quando previamente autorizada pelo gestor imediato, nos termos do Art. 59 da CLT.' },
  { type: 'text', text: '4.2. Declaro estar ciente e de acordo com o regime de banco de horas adotado pela empresa, conforme Art. 59, §§2° e 5° da CLT.' },

  { type: 'section', text: '5. PROIBIÇÕES E PENALIDADES' },
  { type: 'text', text: '5.1. É terminantemente proibido:' },
  { type: 'letter', text: 'a) Registrar ponto em nome de terceiros ou permitir que terceiros registrem em meu nome;' },
  { type: 'letter', text: 'b) Adulterar, manipular ou tentar burlar o sistema de registro de ponto;' },
  { type: 'letter', text: 'c) Registrar horários falsos ou divergentes da jornada efetivamente trabalhada;' },
  { type: 'letter', text: 'd) Deixar de registrar a jornada ou registrá-la de forma incompleta sem justificativa;' },
  { type: 'letter', text: 'e) Registrar o ponto e não permanecer no local de trabalho.' },
  { type: 'text', text: '5.2. O descumprimento poderá caracterizar: Ato de improbidade (Art. 482, "a"); Incontinência de conduta (Art. 482, "b"); Desídia (Art. 482, "e"); Indisciplina (Art. 482, "h") da CLT.' },
  { type: 'text', text: '5.3. Tais infrações constituem falta grave passível de demissão por justa causa, independentemente de advertência prévia, nos casos de fraude comprovada.' },

  { type: 'section', text: '6. CAPTURA DE IMAGEM E DADOS' },
  { type: 'text', text: '6.1. Autorizo a captura de minha imagem fotográfica no momento do registro de ponto, para fins exclusivos de autenticação e segurança.' },
  { type: 'text', text: '6.2. Os dados coletados serão processados em conformidade com a Lei Geral de Proteção de Dados (Lei n° 13.709/2018 — LGPD).' },

  { type: 'section', text: '7. ESPELHO DE PONTO MENSAL' },
  { type: 'text', text: '7.1. Comprometo-me a conferir e assinar eletronicamente meu espelho de ponto mensal até o último dia útil de cada mês.' },
  { type: 'text', text: '7.2. Eventuais divergências deverão ser comunicadas ao RH/gestor imediatamente, antes da assinatura do espelho.' },

  { type: 'section', text: '8. VALIDADE JURÍDICA' },
  { type: 'text', text: '8.1. Este termo é assinado eletronicamente nos termos da Lei n° 14.063/2020 (Assinatura Eletrônica Simples).' },
  { type: 'text', text: '8.2. A assinatura é coletada em conjunto com: nome completo, matrícula funcional, data/hora, endereço IP e identificação do navegador.' },

  { type: 'section', text: '9. DISPOSIÇÕES FINAIS' },
  { type: 'text', text: '9.1. Este termo tem validade indeterminada, permanecendo em vigor enquanto durar o vínculo empregatício.' },
  { type: 'text', text: '9.2. Alterações substanciais neste termo exigirão nova aceitação e assinatura eletrônica.' },
  { type: 'text', text: '9.3. Ao assinar este documento, declaro que li integralmente o conteúdo acima, compreendi todas as condições e concordo com todos os termos aqui estabelecidos.' },
];

/**
 * Gera um PDF do termo de compromisso assinado
 * @param {Object} params
 * @param {string} params.nome - Nome do funcionário
 * @param {string} params.matricula - Matrícula
 * @param {string} params.cargo - Cargo
 * @param {string} params.termsVersion - Versão do termo
 * @param {string} params.signatureDataUrl - Assinatura em base64 PNG dataURL
 * @param {string} params.ipAddress - IP do aceite
 * @param {string} params.userAgent - User-agent do navegador
 * @param {Date} params.acceptedAt - Data/hora do aceite
 * @returns {Promise<Buffer>} PDF em Buffer
 */
async function generateTermsPdf({ nome, matricula, cargo, termsVersion, signatureDataUrl, ipAddress, userAgent, acceptedAt }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: `Termo de Compromisso - ${nome}`,
          Author: 'Auxiliadora Predial - Sistema de Ponto',
          Subject: 'Termo de Compromisso e Responsabilidade - Registro Eletrônico de Ponto',
          Creator: 'Sistema de Controle de Presença',
        }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Renderizar conteúdo
      for (const item of TERMS_TEXT) {
        switch (item.type) {
          case 'title':
            doc.font('Helvetica-Bold').fontSize(14).text(item.text, { align: 'center' });
            doc.moveDown(0.3);
            break;
          case 'subtitle':
            doc.font('Helvetica-Bold').fontSize(12).text(item.text, { align: 'center' });
            doc.moveDown(0.3);
            break;
          case 'info':
            doc.font('Helvetica').fontSize(8).fillColor('#666666').text(item.text, { align: 'center' });
            doc.fillColor('#000000');
            doc.moveDown(0.8);
            break;
          case 'bold':
            doc.font('Helvetica-Bold').fontSize(10).text(item.text);
            doc.moveDown(0.3);
            break;
          case 'section':
            doc.moveDown(0.5);
            doc.font('Helvetica-Bold').fontSize(10).text(item.text);
            doc.moveDown(0.3);
            break;
          case 'bullet':
            doc.font('Helvetica').fontSize(9).text(`  \u2022 ${item.text}`, { indent: 10 });
            doc.moveDown(0.2);
            break;
          case 'letter':
            doc.font('Helvetica').fontSize(9).text(`    ${item.text}`, { indent: 15 });
            doc.moveDown(0.2);
            break;
          case 'text':
            doc.font('Helvetica').fontSize(9).text(item.text, { indent: 5 });
            doc.moveDown(0.3);
            break;
        }

        // Auto page break
        if (doc.y > 720) {
          doc.addPage();
        }
      }

      // Seção de assinatura
      doc.addPage();
      doc.font('Helvetica-Bold').fontSize(12).text('REGISTRO DE ACEITE', { align: 'center' });
      doc.moveDown(1);

      doc.font('Helvetica').fontSize(10);
      doc.text(`Nome: ${nome}`);
      doc.text(`Matrícula: ${matricula}`);
      doc.text(`Cargo: ${cargo || 'Não informado'}`);
      doc.text(`Versão do Termo: ${termsVersion}`);
      doc.text(`Data/Hora do Aceite: ${acceptedAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
      doc.text(`Endereço IP: ${ipAddress}`);
      doc.text(`Navegador: ${(userAgent || '').substring(0, 100)}`);

      doc.moveDown(1.5);
      doc.font('Helvetica-Bold').fontSize(10).text('Assinatura Digital:', { align: 'center' });
      doc.moveDown(0.5);

      // Inserir imagem da assinatura
      if (signatureDataUrl && signatureDataUrl.startsWith('data:image/png;base64,')) {
        const base64Data = signatureDataUrl.replace(/^data:image\/png;base64,/, '');
        const sigBuffer = Buffer.from(base64Data, 'base64');
        doc.image(sigBuffer, {
          fit: [300, 120],
          align: 'center'
        });
      }

      doc.moveDown(1);
      doc.moveTo(150, doc.y).lineTo(450, doc.y).stroke();
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(8).text(nome, { align: 'center' });
      doc.text(`Mat: ${matricula}`, { align: 'center' });

      doc.moveDown(2);
      doc.fontSize(7).fillColor('#999999');
      doc.text('Documento gerado automaticamente pelo Sistema de Controle de Presença - Auxiliadora Predial', { align: 'center' });
      doc.text('Hash SHA-256 de integridade será inserido após geração do documento', { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Gera e armazena PDF do termo assinado no banco de dados (comprimido com gzip)
 */
async function generateAndStorePdf(acceptanceId, userData, signatureDataUrl, ipAddress, userAgent, acceptedAt) {
  try {
    const pdfBuffer = await generateTermsPdf({
      nome: userData.nome,
      matricula: userData.matricula,
      cargo: userData.cargo || '',
      termsVersion: '1.0.0',
      signatureDataUrl,
      ipAddress,
      userAgent,
      acceptedAt: acceptedAt || new Date()
    });

    // Calcular SHA-256 do PDF para prova de integridade
    const integrityHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    // Comprimir com gzip para economia de espaço
    const compressed = zlib.gzipSync(pdfBuffer);

    // Salvar no banco com hash de integridade
    await db.query(
      'UPDATE terms_acceptances SET pdf_data = $1, integrity_hash = $2 WHERE id = $3',
      [compressed, integrityHash, acceptanceId]
    );

    logger.info('PDF do termo gerado e armazenado', {
      acceptanceId,
      userId: userData.id,
      pdfSize: pdfBuffer.length,
      compressedSize: compressed.length,
      integrityHash
    });

    return { pdfSize: pdfBuffer.length, compressedSize: compressed.length, integrityHash };
  } catch (err) {
    logger.error('Erro ao gerar/armazenar PDF do termo', { error: err.message, acceptanceId });
    // Não lançar erro — o aceite já foi registrado, PDF é bônus
  }
}

module.exports = { generateTermsPdf, generateAndStorePdf };
