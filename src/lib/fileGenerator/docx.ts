import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType } from 'docx';
import type { FileContent } from './types';

export async function generateDOCX(file: FileContent): Promise<Blob> {
  const children: any[] = [];

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: file.title,
          bold: true,
          size: 48,
        }),
      ],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    })
  );

  if (file.metadata) {
    for (const [key, value] of Object.entries(file.metadata)) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${key}: ${value}`,
              size: 20,
              color: '666666',
            }),
          ],
        })
      );
    }
    children.push(new Paragraph({ text: '' }));
  }

  const paragraphs = file.content.split('\n').filter(p => p.trim());
  for (const para of paragraphs) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: para,
            size: 24,
          }),
        ],
        spacing: { after: 200 },
      })
    );
  }

  if (file.sections) {
    for (const section of file.sections) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section.heading,
              bold: true,
              size: 32,
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      );

      const sectionParagraphs = section.content.split('\n').filter(p => p.trim());
      for (const para of sectionParagraphs) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: para,
                size: 24,
              }),
            ],
            spacing: { after: 200 },
          })
        );
      }
    }
  }

  if (file.tables) {
    for (const table of file.tables) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '',
              size: 24,
            }),
          ],
          spacing: { before: 200 },
        })
      );

      const tableRows = [
        new TableRow({
          children: table.headers.map(header =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: header,
                      bold: true,
                      size: 20,
                    }),
                  ],
                }),
              ],
              width: { size: Math.floor(100 / table.headers.length), type: WidthType.PERCENTAGE },
            })
          ),
        }),
        ...table.rows.map(row =>
          new TableRow({
            children: row.map(cell =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: cell,
                        size: 20,
                      }),
                    ],
                  }),
                ],
                width: { size: Math.floor(100 / row.length), type: WidthType.PERCENTAGE },
              })
            ),
          })
        ),
      ];

      children.push(
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      );
    }
  }

  const doc = new Document({
    sections: [{ children }],
  });

  return await Packer.toBlob(doc);
}
