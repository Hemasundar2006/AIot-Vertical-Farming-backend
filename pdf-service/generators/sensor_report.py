import io
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors

def generate_sensor_report_pdf(zone_id, start_date, end_date, sensor_data):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []
    
    styles = getSampleStyleSheet()
    title_style = styles['Heading1']
    normal_style = styles['Normal']
    
    # Title
    elements.append(Paragraph(f"Sensor Report for Zone: {zone_id}", title_style))
    elements.append(Spacer(1, 12))
    
    # Date Range
    elements.append(Paragraph(f"Date Range: {start_date} to {end_date}", normal_style))
    elements.append(Spacer(1, 12))
    
    # Data Table
    data = [["Timestamp", "Soil", "Temperature", "Humidity", "Gas", "Light"]]
    for record in sensor_data:
        data.append([
            record.get("timestamp", "")[:19].replace("T", " "),
            str(record.get("soil", "")),
            str(record.get("temp", "")),
            str(record.get("hum", "")),
            str(record.get("gas", "")),
            str(record.get("light", "")),
        ])
    
    table = Table(data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    
    elements.append(table)
    
    # Add summary if needed...
    
    doc.build(elements)
    buffer.seek(0)
    return buffer
