const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const dateHelper = require('../utils/dateHelper');

class PdfService {

    generateMirrorPdf(mirrorData, userData, res) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ margin: 50 });

                // Pipe para a resposta HTTP
                doc.pipe(res);

                // --- CABEÇALHO ---
                doc.fontSize(20).text('Espelho de Ponto Eletrônico', { align: 'center' });
                doc.moveDown();

                doc.fontSize(12).text('Empresa: Auxiliadora Predial', { align: 'left' });
                doc.text(`CNPJ: 00.000.000/0001-00`);
                doc.moveDown();

                // --- DADOS DO FUNCIONÁRIO ---
                doc.rect(50, 130, 500, 60).stroke();
                doc.text(`Funcionário: ${userData.nome}`, 60, 140);
                doc.text(`Matrícula: ${userData.matricula}`, 350, 140);
                doc.text(`Cargo: ${userData.cargo}`, 60, 160);

                const periodo = `${dateHelper.formatDateBR(mirrorData.period_start)} a ${dateHelper.formatDateBR(mirrorData.period_end)}`;
                doc.text(`Período: ${periodo}`, 60, 180);

                doc.moveDown(4);

                // --- TABELA DE PONTOS ---
                // Cabeçalho da tabela
                const tableTop = 230;
                const colX = { data: 50, dia: 120, entrada: 200, intervalo: 270, retorno: 340, saida: 410, total: 480 };

                doc.font('Helvetica-Bold');
                doc.text('Data', colX.data, tableTop);
                doc.text('Entrada', colX.entrada, tableTop);
                doc.text('Saída', colX.saida, tableTop);
                doc.text('Total', colX.total, tableTop);

                doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

                // Dados da tabela (Mockado por enquanto, precisa vir parseado do mirrorData.status)
                // O mirrorData.signature_hash contém o hash do conteúdo JSON original. 
                // Idealmente teríamos os dados brutos aqui.
                // Vou assumir que mirrorData vem com um objeto 'report' embutido ou buscado antes.

                // ... (Lógica de iteração simples)
                let y = tableTop + 30;
                doc.font('Helvetica').fontSize(10);

                // Exemplo genérico (pois os dados reais estão no JSON do banco)
                doc.text('Consultar sistema para detalhes diários', 50, y);

                // --- RESUMO ---
                y += 50;
                doc.font('Helvetica-Bold').fontSize(12);
                doc.text('Resumo do Mês', 50, y);
                doc.rect(50, y + 15, 500, 40).stroke();
                doc.font('Helvetica').fontSize(10);
                doc.text(`Saldo Anterior: 00:00`, 60, y + 25); // Placeholder
                doc.text(`Saldo Atual: 00:00`, 300, y + 25); // Placeholder

                // --- ASSINATURAS ---
                y += 150;
                doc.moveTo(50, y).lineTo(250, y).stroke();
                doc.text('Empregador', 50, y + 10, { width: 200, align: 'center' });

                doc.moveTo(300, y).lineTo(500, y).stroke();
                doc.text(userData.nome, 300, y + 10, { width: 200, align: 'center' });

                if (mirrorData.status === 'signed') {
                    doc.fontSize(8).fillColor('green').text(`ASSINADO ELETRONICAMENTE EM ${new Date(mirrorData.signed_at).toLocaleString()}`, 300, y + 25, { width: 200, align: 'center' });
                    doc.fillColor('black');
                } else {
                    doc.fontSize(8).fillColor('red').text('PENDENTE DE ASSINATURA', 300, y + 25, { width: 200, align: 'center' });
                    doc.fillColor('black');
                }

                // --- RODAPÉ (HASH JURÍDICO) ---
                const bottom = doc.page.height - 50;
                doc.fontSize(8).text(`Hash de Validação Jurídica: ${mirrorData.signature_hash || 'PENDENTE'}`, 50, bottom);
                doc.text(`Gerado em: ${new Date().toISOString()}`, 50, bottom + 10);
                doc.text('Sistema de Ponto Eletrônico - Auxiliadora Predial', 50, bottom + 10, { align: 'right' });

                doc.end();
                resolve();

            } catch (error) {
                reject(error);
            }
        });
    }
}

module.exports = new PdfService();
