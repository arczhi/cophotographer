#!/bin/bash

# CoPhotographer 启动脚本

echo "🚀 启动 CoPhotographer..."

# 检查Python版本
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "✓ Python版本: $python_version"

# 检查依赖
if [ ! -d "venv" ]; then
    echo "📦 创建虚拟环境..."
    python3 -m venv venv
fi

echo "📦 激活虚拟环境..."
source venv/bin/activate

echo "📦 安装依赖（首次安装可能需要几分钟）..."
pip install --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org -r requirements.txt

# 检查环境变量
if [ -z "$DEEPSEEK_API_KEY" ]; then
    echo "⚠️  警告: DEEPSEEK_API_KEY 未设置，AI功能将不可用"
    echo "   设置方法: export DEEPSEEK_API_KEY='your_api_key'"
fi

echo "✓ 准备完成"
echo ""
echo "🌐 启动服务..."
echo "   访问地址: http://localhost:8000"
echo "   按 Ctrl+C 停止服务"
echo ""
echo "   后台运行，日志输出到 cophotographer.log"
nohup python app.py > cophotographer.log 2>&1 &
