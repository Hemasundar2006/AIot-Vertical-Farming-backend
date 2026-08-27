from fastapi import FastAPI, Response, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Any
from generators.sensor_report import generate_sensor_report_pdf
from generators.bill_pdf import generate_bill_pdf

app = FastAPI(title="PDF Generation Service")

class SensorDataInput(BaseModel):
    zoneId: str
    startDate: str
    endDate: str
    sensorData: List[Any]

class BillDataInput(BaseModel):
    userName: str
    month: int
    year: int
    amount: float
    breakdown: Optional[List[Any]] = None

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/generate-report")
def generate_report(data: SensorDataInput):
    try:
        pdf_buffer = generate_sensor_report_pdf(
            zone_id=data.zoneId,
            start_date=data.startDate,
            end_date=data.endDate,
            sensor_data=data.sensorData
        )
        return Response(content=pdf_buffer.getvalue(), media_type="application/pdf")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-bill-pdf")
def generate_bill(data: BillDataInput):
    try:
        pdf_buffer = generate_bill_pdf(
            user_name=data.userName,
            month=data.month,
            year=data.year,
            amount=data.amount,
            breakdown=data.breakdown
        )
        return Response(content=pdf_buffer.getvalue(), media_type="application/pdf")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
