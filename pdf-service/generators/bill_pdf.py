import io
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

def generate_bill_pdf(user_name, month, year, amount, breakdown):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []
    
    styles = getSampleStyleSheet()
    title_style = styles['Heading1']
    normal_style = styles['Normal']
    
    elements.append(Paragraph("Invoice", title_style))
    elements.append(Spacer(1, 12))
    
    elements.append(Paragraph(f"Billed to: {user_name}", normal_style))
    elements.append(Paragraph(f"Billing Period: {month}/{year}", normal_style))
    elements.append(Spacer(1, 12))
    
    elements.append(Paragraph(f"Total Amount: ${amount:.2f}", styles['Heading2']))
    
    if breakdown:
        elements.append(Spacer(1, 12))
        elements.append(Paragraph("Breakdown:", normal_style))
        for item in breakdown:
            elements.append(Paragraph(f"- {item}", normal_style))
            
    doc.build(elements)
    buffer.seek(0)
    return buffer
