const PdfPrinter = require('pdfmake');
const path = require('path');

const fonts = {
    Roboto: {
        normal: path.join(__dirname, '..', '..', 'node_modules', 'pdfmake', 'font', 'Roboto-Regular.ttf'),
        bold: path.join(__dirname, '..', '..', 'node_modules', 'pdfmake', 'font', 'Roboto-Medium.ttf'),
        italics: path.join(__dirname, '..', '..', 'node_modules', 'pdfmake', 'font', 'Roboto-Italic.ttf'),
        bolditalics: path.join(__dirname, '..', '..', 'node_modules', 'pdfmake', 'font', 'Roboto-MediumItalic.ttf')
    }
};

const printer = new PdfPrinter(fonts);

class PdfGeneratorService {

    async generateTimeMirror(userData, reportData, signatureData = null) {
        const { user, period } = userData;
        const { resumo, detalhes } = reportData;

        const docDefinition = {
            pageSize: 'A4',
            pageMargins: [40, 60, 40, 60],
            content: [
                // Cabeçalho
                {
                    columns: [
                        {
                            stack: [
                                { text: 'ESPELHO DE PONTO INDIVIDUAL', style: 'header' },
                                { text: `Período: 01/${period.month}/${period.year} a ${detalhes.length}/${period.month}/${period.year}`, style: 'subheader' }
                            ]
                        },
                        {
                            text: 'IMOBILIÁRIA JARDIM DO LAGO',
                            alignment: 'right',
                            style: 'companyName'
                        }
                    ]
                },

                { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor: '#eeeeee' }] },
                { text: '', margin: [0, 10] },

                // Dados do Funcionário
                {
                    style: 'tableExample',
                    table: {
                        widths: ['*', '*'],
                        body: [
                            [
                                { text: `Funcionário: ${user.nome}`, bold: true },
                                { text: `Matrícula: ${user.matricula}`, bold: true }
                            ],
                            [
                                { text: `Cargo: ${user.cargo || 'Não informado'}` },
                                { text: `Status: ${user.status.toUpperCase()}` }
                            ]
                        ]
                    },
                    layout: 'noBorders'
                },

                { text: '', margin: [0, 10] },

                // Tabela de Registros
                {
                    table: {
                        headerRows: 1,
                        widths: ['auto', 'auto', 'auto', 'auto', 'auto', '*', 'auto'],
                        body: [
                            [
                                { text: 'DATA', style: 'tableHeader' },
                                { text: 'ENT.', style: 'tableHeader' },
                                { text: 'S.INT', style: 'tableHeader' },
                                { text: 'R.INT', style: 'tableHeader' },
                                { text: 'SAÍDA', style: 'tableHeader' },
                                { text: 'TOTAL', style: 'tableHeader' },
                                { text: 'STATUS', style: 'tableHeader' }
                            ],
                            ...detalhes.map(dia => [
                                new Date(dia.date).toLocaleDateString('pt-BR'),
                                dia.entrada ? dia.entrada.substring(0, 5) : '--:--',
                                dia.saida_intervalo ? dia.saida_intervalo.substring(0, 5) : '--:--',
                                dia.retorno_intervalo ? dia.retorno_intervalo.substring(0, 5) : '--:--',
                                dia.saida_final ? dia.saida_final.substring(0, 5) : '--:--',
                                dia.hours_worked ? `${parseFloat(dia.hours_worked).toFixed(2)}h` : '0.00h',
                                { text: dia.status_dia, color: dia.status_dia === 'Completo' ? 'green' : (dia.status_dia === 'Ausente' ? 'red' : 'orange'), fontSize: 8 }
                            ])
                        ]
                    }
                },

                { text: '', margin: [0, 20] },

                // Resumo do Mês
                {
                    columns: [
                        { width: '*', text: '' },
                        {
                            width: 200,
                            table: {
                                widths: ['*', 'auto'],
                                body: [
                                    [{ text: 'Total de Horas:', bold: true }, `${resumo.total_horas}h`],
                                    [{ text: 'Dias Completos:', bold: true }, resumo.dias_completos],
                                    [{ text: 'Ausências:', bold: true }, resumo.ausencias],
                                    [{ text: 'Ajustes no Mês:', bold: true }, resumo.dias_incompletos]
                                ]
                            }
                        }
                    ]
                },

                { text: '', pageBreak: 'before', margin: [0, 0], condition: (signatureData) },

                // Área de Assinatura
                {
                    stack: [
                        { text: 'DECLARAÇÃO DE CONFORMIDADE', style: 'signatureTitle' },
                        {
                            text: 'Declaro que as informações constantes neste espelho de ponto são verídicas e refletem fielmente a jornada de trabalho realizada no período acima mencionado, em total conformidade com a Portaria 671/MTE.',
                            style: 'signatureText'
                        },
                        { text: '', margin: [0, 30] },
                        {
                            columns: [
                                {
                                    width: '*',
                                    stack: [
                                        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1 }] },
                                        { text: user.nome, margin: [0, 5] },
                                        { text: 'Assinatura do Funcionário', fontSize: 8, color: '#888' }
                                    ],
                                    alignment: 'center'
                                },
                                {
                                    width: '*',
                                    stack: [
                                        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1 }] },
                                        { text: 'IMOBILIÁRIA JARDIM DO LAGO', margin: [0, 5] },
                                        { text: 'Assinatura da Empresa', fontSize: 8, color: '#888' }
                                    ],
                                    alignment: 'center'
                                }
                            ]
                        }
                    ],
                    margin: [0, 40]
                },

                // Hash de Segurança (Rodapé)
                signatureData ? {
                    stack: [
                        { text: 'ASSINATURA ELETRÔNICA', bold: true, fontSize: 10 },
                        { text: `Hash de Integridade: ${signatureData.hash}`, fontSize: 7, font: 'Roboto' },
                        { text: `Assinado em: ${new Date(signatureData.date).toLocaleString('pt-BR')}`, fontSize: 7 },
                        { text: `IP de Origem: ${signatureData.ip}`, fontSize: 7 }
                    ],
                    margin: [0, 20],
                    color: '#666'
                } : { text: 'Documento pendente de assinatura eletrônica.', color: 'red', fontSize: 10, alignment: 'center', margin: [0, 20] }
            ],
            styles: {
                header: { fontSize: 18, bold: true, color: '#1a202c' },
                subheader: { fontSize: 11, color: '#718096', margin: [0, 5, 0, 10] },
                companyName: { fontSize: 12, bold: true, color: '#2d3748' },
                tableHeader: { bold: true, fontSize: 10, color: 'black', fillColor: '#f8fafc', margin: [0, 5] },
                signatureTitle: { fontSize: 12, bold: true, margin: [0, 0, 0, 10], alignment: 'center' },
                signatureText: { fontSize: 9, color: '#4a5568', textAlign: 'justify' }
            },
            defaultStyle: {
                fontSize: 10,
                font: 'Roboto'
            }
        };

        return printer.createPdfKitDocument(docDefinition);
    }
}

module.exports = new PdfGeneratorService();
