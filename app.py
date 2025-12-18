"""
CoPhotographer - 摄影参数学习应用
轻量级FastAPI后端，提供AI曝光建议
"""
import os
import httpx
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from typing import Optional
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# 初始化速率限制器
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="CoPhotographer")
app.state.limiter = limiter

# 添加rate limit异常处理
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"status": "rate_limit", "message": "请求频率过高"}
    )

# 挂载静态文件
app.mount("/static", StaticFiles(directory="static"), name="static")

# 模板配置
templates = Jinja2Templates(directory="templates")

# DeepSeek API配置
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"


class ExposureRequest(BaseModel):
    """曝光参数请求模型"""
    aperture: float  # 光圈值 f/1.8 - f/22
    shutter: str  # 快门速度 1/2 - 1/8000
    iso: int  # ISO 200 - 6400
    brightness: float  # 图像亮度评估值 0-255
    status: str  # 曝光状态：overexposed/underexposed/slightly_overexposed/slightly_underexposed
    aperture_options: list = None  # 可选光圈值列表
    shutter_options: list = None  # 可选快门值列表
    iso_options: list = None  # 可选ISO值列表

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """主页"""
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/api/config")
async def get_config() -> JSONResponse:
    """获取配置信息"""
    return JSONResponse({
        "has_deepseek_key": bool(DEEPSEEK_API_KEY)
    })


@app.post("/api/check-exposure")
@limiter.limit("5/second")
async def check_exposure(request: Request, data: ExposureRequest) -> JSONResponse:
    """
    检查曝光参数并提供AI建议
    如果曝光异常（过曝或欠曝），调用DeepSeek提供建议
    """
    # 曝光状态已由前端计算传来
    is_overexposed = data.status in ['overexposed', 'slightly_overexposed']
    is_underexposed = data.status in ['underexposed', 'slightly_underexposed']
    
    if not is_overexposed and not is_underexposed:
        return JSONResponse({
            "status": "ok",
            "message": "曝光正常"
        })
    
    # 需要AI建议
    if not DEEPSEEK_API_KEY:
        return JSONResponse({
            "status": "ok",
            "message": "曝光异常，AI服务未配置",
            "suggestion": None
        })
    
    try:
        suggestion = await get_ai_suggestion(data)
        return JSONResponse({
            "status": "warning",
            "message": f"曝光{('过曝' if is_overexposed else '欠曝')}",
            "suggestion": suggestion
        })
    except Exception as e:
        return JSONResponse({
            "status": "error",
            "message": f"AI服务异常: {str(e)}",
            "suggestion": "请稍后重试"
        })


async def get_ai_suggestion(data: ExposureRequest) -> str:
    """调用DeepSeek获取曝光建议"""
    
    exposure_issue = "过曝" if data.status in ['overexposed', 'slightly_overexposed'] else "欠曝"
    severity = "严重" if data.status in ['overexposed', 'underexposed'] else "轻微"
    
    # 构建可选参数提示
    options_hint = ""
    if data.aperture_options:
        options_hint += f"可选光圈值: {', '.join([f'f/{v}' for v in data.aperture_options])}\n"
    if data.shutter_options:
        options_hint += f"可选快门值: {', '.join(data.shutter_options)}\n"
    if data.iso_options:
        options_hint += f"可选ISO值: {', '.join([str(v) for v in data.iso_options])}\n"
    
    prompt = f"""你是一位专业摄影师。用户照片{severity}{exposure_issue}，亮度值{data.brightness:.1f}。

当前参数:
- 光圈: f/{data.aperture}
- 快门: {data.shutter}
- ISO: {data.iso}

{options_hint}
请根据上述可选参数和曝光问题，给出具体的调整建议（50字以内）。
建议只能使用上面列出的可选参数值，不要建议范围外的参数。
建议至少包含2-3个参数的具体调整值。

调整原则：
- 过曝时：减小光圈（f值增大）或加快快门（分母增大）或降低ISO
- 欠曝时：增大光圈（f值减小）或减慢快门（分母减小）或提高ISO"""

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            DEEPSEEK_API_URL,
            headers={
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "deepseek-chat",
                "messages": [
                    {"role": "system", "content": "你是一位专业摄影师，擅长指导初学者快速调整曝光参数。给出的建议要具体、可执行、严格按照提供的参数选项。"},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7,
                "max_tokens": 250
            }
        )
        response.raise_for_status()
        result = response.json()
        return result["choices"][0]["message"]["content"].strip()


@app.get("/health")
async def health():
    """健康检查"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
