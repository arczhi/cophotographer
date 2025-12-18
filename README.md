# CoPhotographer 📷

一个帮助用户快速掌握摄影光圈、快门、ISO知识的交互式Web应用。

## ✨ 功能特点

- 🎨 **相机模拟界面**：滚轮式参数选择器（光圈、快门、ISO），移动端友好
- 🎭 **多主题切换**：三种精美主题任意切换
  - 📷 **经典主题**：Nikon 35Ti复古拟物化设计
  - 💖 **可爱主题**：日系CCD相机风格，粉色系，吸引年轻女性用户
  - ⚪ **极简主题**：现代简约风格，线条简洁清晰
- 🖼️ **实时图像处理**：客户端实时预览照片效果，支持：
  - 曝光调整（基于光圈、快门、ISO组合）
  - 景深效果（光圈越大，背景越模糊）
  - ISO噪点模拟（ISO越高，噪点越明显）
- 🤖 **AI曝光建议**：接入DeepSeek AI
  - 自动检测过曝/欠曝并给出调整建议
  - 参数建议严格基于应用内可用的参数选项（f/1.8-f/22、1/2-1/8000秒、ISO 200-6400）
  - 确保建议参数用户能够实际选择
- 📸 **AI图片分析**：上传照片后AI自动分析
  - 识别照片内容
  - 评价拍摄效果（曝光、清晰度、构图等）
  - 给出改进建议
- ⚡ **接口限流保护**：单IP每分钟10次图片分析、每分钟5次曝光查询
- 📥 **照片下载**：一键下载调整后的照片
- 🚀 **轻量高效**：客户端图像处理，服务器零存储
- 💾 **主题记忆**：自动保存用户主题偏好

## 📋 参数范围

- **光圈 (Aperture)**：f/1.8 - f/22
- **快门 (Shutter)**：1/4 - 1/8000 秒
- **ISO**：200 - 6400

## 🛠️ 技术栈

- **后端**：FastAPI + Python 3.13
- **前端**：原生 HTML5 + CSS3 + JavaScript（Canvas API）
- **AI服务**：DeepSeek API

## 📦 安装部署

### 1. 环境要求

- Python 3.13+
- 2核2G内存（支持1000+并发用户）

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 配置DeepSeek API（可选）

如果需要AI曝光建议功能，请设置环境变量：

```bash
export DEEPSEEK_API_KEY="your_deepseek_api_key"
```

获取API密钥：https://platform.deepseek.com/

### 4. 启动应用

```bash
python app.py
```

或使用uvicorn：

```bash
uvicorn app:app --host 0.0.0.0 --port 8000
```

### 5. 访问应用

打开浏览器访问：http://localhost:8000

## 🎯 使用说明

1. **上传照片**：点击或拖拽上传一张照片
2. **调整参数**：通过三个滑块调整光圈、快门、ISO
3. **实时预览**：查看参数调整后的实时效果
4. **查看建议**：如果曝光异常，系统会自动弹出AI建议
5. **下载照片**：点击快门按钮下载调整后的照片

## 🚀 生产环境部署

### 使用Gunicorn + Uvicorn Workers

```bash
pip install gunicorn

gunicorn app:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --access-logfile - \
  --error-logfile -
```

### 使用Systemd服务

创建 `/etc/systemd/system/cophotographer.service`：

```ini
[Unit]
Description=CoPhotographer Service
After=network.target

[Service]
Type=notify
User=www-data
WorkingDirectory=/path/to/cophotographer
Environment="DEEPSEEK_API_KEY=your_api_key"
ExecStart=/usr/bin/python3 -m gunicorn app:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000
Restart=always

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable cophotographer
sudo systemctl start cophotographer
```

### Nginx反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🔧 性能优化

### 1. 客户端优化
- ✅ 所有图像处理在客户端完成（Canvas API）
- ✅ 不上传原图到服务器
- ✅ 异步AI请求，不阻塞UI

### 2. 服务器优化
- ✅ 轻量级FastAPI框架
- ✅ 异步HTTP请求（httpx）
- ✅ 无文件存储，零磁盘IO
- ✅ 支持多进程部署（Gunicorn workers）

### 3. 并发能力

在2核2G机器上，推荐配置：
- **Workers数量**：4（2 * CPU核心数）
- **预期并发**：1000+ 用户
- **内存占用**：约500MB-1GB

## 📁 项目结构

```
cophotographer/
├── app.py                 # FastAPI后端主程序
├── requirements.txt       # Python依赖
├── README.md             # 项目文档
├── prd.txt               # 产品需求文档
├── static/               # 静态资源
│   ├── style.css         # 样式文件
│   └── app.js            # 前端逻辑
└── templates/            # HTML模板
    └── index.html        # 主页面
```

## 🐛 故障排查

### 问题1：AI建议不工作
- 检查是否设置了 `DEEPSEEK_API_KEY` 环境变量
- 检查API密钥是否有效
- 查看服务器日志：`journalctl -u cophotographer -f`

### 问题2：图像处理慢
- 确保使用现代浏览器（Chrome、Firefox、Safari）
- 上传的图片尺寸建议在5MB以内
- 客户端会自动缩放到800px宽度

### 问题3：无法启动服务
```bash
# 检查端口是否被占用
sudo lsof -i :8000

# 检查Python版本
python --version

# 重新安装依赖
pip install -r requirements.txt --upgrade
```

## 📄 许可证

MIT License

## 👨‍💻 作者

CoPhotographer Team

## 🙏 致谢

- DeepSeek AI for exposure analysis
- FastAPI framework
- HTML5 Canvas API
