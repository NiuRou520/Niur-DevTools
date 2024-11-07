/**
 * 图片压缩工具主要功能脚本
 * 实现图片压缩、预览和批量处理功能
 */

// 全局变量
const MAX_FILES = 20;
let currentFiles = [];

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const imagesList = document.getElementById('imagesList');

    // 文件选择处理
    fileInput.addEventListener('change', handleFiles);

    // 拖放处理
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFiles({ target: { files: e.dataTransfer.files } });
    });

    // 添加质量滑块事件监听
    const qualitySlider = document.getElementById('quality');
    const qualityValue = document.getElementById('qualityValue');
    
    qualitySlider.addEventListener('input', (e) => {
        const value = e.target.value;
        qualityValue.textContent = `${value}%`;
        document.querySelector('.quality-tip').textContent = 
            `压缩掉原文件大小的 ${value}%`;
    });

    const startCompressBtn = document.getElementById('startCompress');
    const downloadAllBtn = document.getElementById('downloadAll');

    startCompressBtn.addEventListener('click', async () => {
        if (currentFiles.length === 0) {
            showToast('请先选择图片', 'error');
            return;
        }

        startCompressBtn.disabled = true;
        startCompressBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> 压缩中...';

        try {
            const items = document.querySelectorAll('.image-item');
            for (let i = 0; i < currentFiles.length; i++) {
                await processImage(currentFiles[i], items[i]);
            }

            showToast(`成功处理 ${currentFiles.length} 张图片`);
            downloadAllBtn.style.display = 'block';
        } catch (error) {
            console.error('批量处理失败:', error);
            showToast('部分图片处理失败', 'error');
        } finally {
            startCompressBtn.disabled = false;
            startCompressBtn.innerHTML = '<i class="bi bi-play-fill"></i> 开始压缩';
        }
    });

    downloadAllBtn.addEventListener('click', () => {
        const items = document.querySelectorAll('.image-item');
        items.forEach(item => {
            const downloadBtn = item.querySelector('.download-btn');
            if (downloadBtn && downloadBtn.style.display !== 'none') {
                downloadBtn.click();
            }
        });
    });
});

// 处理文件选择
async function handleFiles(event) {
    const files = Array.from(event.target.files).filter(file => file.type.startsWith('image/'));
    
    if (files.length === 0) {
        showToast('请选择图片文件', 'error');
        return;
    }

    if (files.length > MAX_FILES) {
        showToast(`最多只能选择 ${MAX_FILES} 张图片`, 'error');
        return;
    }

    currentFiles = files;
    const imagesList = document.getElementById('imagesList');
    imagesList.innerHTML = ''; // 清空列表

    // 只创建预览，不压缩
    for (const file of files) {
        const imageItem = createImageItem(file);
        imagesList.appendChild(imageItem);
        await showPreview(file, imageItem); // 只显示预览
    }

    // 显示压缩按钮
    document.getElementById('startCompress').style.display = 'block';
}

// 新增预览函数
async function showPreview(file, imageItem) {
    try {
        // 显示原图预览
        const originalPreview = imageItem.querySelector('.original');
        const originalUrl = URL.createObjectURL(file);
        originalPreview.src = originalUrl;

        // 获取图片尺寸
        const dimensions = await getImageDimensions(originalUrl);
        imageItem.querySelector('.dimensions').textContent = 
            `${dimensions.width} × ${dimensions.height}`;

        // 显示原始文件大小
        imageItem.querySelector('.compressed-size').textContent = 
            `等待压缩... (原始大小: ${formatFileSize(file.size)})`;

    } catch (error) {
        console.error('预览失败:', error);
        showToast('图片预览失败', 'error');
    }
}

// 创建图片项
function createImageItem(file) {
    const item = document.createElement('div');
    item.className = 'image-item';
    item.innerHTML = `
        <div class="image-preview-container">
            <div class="original-preview">
                <h4>原图</h4>
                <div class="image-preview-wrapper">
                    <img class="image-preview original" alt="原图预览">
                </div>
                <div class="image-info">
                    <span>大小: ${formatFileSize(file.size)}</span>
                    <span class="dimensions"></span>
                </div>
            </div>
            <div class="compressed-preview">
                <h4>压缩后</h4>
                <div class="image-preview-wrapper">
                    <img class="image-preview compressed" alt="压缩后预览">
                </div>
                <div class="image-info">
                    <span class="compressed-size">等待压缩...</span>
                    <button class="download-btn" style="display: none;">
                        <i class="bi bi-download"></i> 下载
                    </button>
                </div>
            </div>
        </div>
    `;

    // 添加点击预览功能
    const previewWrappers = item.querySelectorAll('.image-preview-wrapper');
    previewWrappers.forEach(wrapper => {
        wrapper.addEventListener('click', () => {
            const img = wrapper.querySelector('.image-preview');
            showImageModal(img.src);
        });
    });

    return item;
}

// 添加全屏预览功能
function showImageModal(src) {
    let modal = document.querySelector('.image-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'image-modal';
        modal.innerHTML = `<img src="${src}" alt="预览图片">`;
        document.body.appendChild(modal);
        
        // 点击关闭
        modal.addEventListener('click', () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        });
    } else {
        modal.querySelector('img').src = src;
    }
    
    // 显示模态框
    setTimeout(() => modal.classList.add('active'), 10);
}

// 处理图片
async function processImage(file, imageItem) {
    try {
        // 显示原图预览
        const originalPreview = imageItem.querySelector('.original');
        const originalUrl = URL.createObjectURL(file);
        originalPreview.src = originalUrl;

        // 获取图片尺寸
        const dimensions = await getImageDimensions(originalUrl);
        imageItem.querySelector('.dimensions').textContent = 
            `${dimensions.width} × ${dimensions.height}`;

        // 添加进度条
        const progressBar = document.createElement('div');
        progressBar.className = 'compression-progress';
        progressBar.innerHTML = '<div class="progress-bar"></div>';
        imageItem.appendChild(progressBar);

        // 获取压缩比例
        const compressionRatio = parseInt(document.getElementById('quality').value) / 100;
        const targetSize = file.size * (1 - compressionRatio);

        // 优化的压缩配置
        const options = {
            maxSizeMB: targetSize / (1024 * 1024),
            useWebWorker: true,
            maxIteration: 10, // 增加迭代次数以获得更好的质量
            initialQuality: 0.9, // 从高质量开始
            alwaysKeepResolution: true, // 保持分辨率
            exifOrientation: true, // 保持图片方向
            fileType: 'image/jpeg', // 使用JPEG格式以获得更好的压缩效果
            strict: false, // 允许质量调整以达到目标大小
            onProgress: (progress) => {
                const progressBarElement = progressBar.querySelector('.progress-bar');
                progressBarElement.style.width = `${progress * 100}%`;
            }
        };

        try {
            // 压缩图片
            let compressedFile = await imageCompression(file, options);
            
            // 如果压缩后的文件仍然太大，尝试逐步降低质量
            let quality = 0.9;
            while (compressedFile.size > targetSize && quality > 0.5) {
                quality -= 0.1;
                options.initialQuality = quality;
                compressedFile = await imageCompression(file, options);
            }

            const compressedUrl = URL.createObjectURL(compressedFile);
            
            // 显示压缩后预览
            const compressedPreview = imageItem.querySelector('.compressed');
            compressedPreview.src = compressedUrl;
            
            // 更新压缩信息
            const actualRatio = ((1 - compressedFile.size / file.size) * 100).toFixed(1);
            imageItem.querySelector('.compressed-size').textContent = 
                `${formatFileSize(compressedFile.size)} (压缩了 ${actualRatio}%)`;

            // 存储压缩后的文件以供下载
            imageItem.dataset.compressedFile = compressedUrl;

            // 显示下载按钮
            const downloadBtn = imageItem.querySelector('.download-btn');
            downloadBtn.style.display = 'block';
            downloadBtn.onclick = () => downloadImage(compressedFile, file.name);

            // 移除进度条
            setTimeout(() => {
                progressBar.remove();
            }, 500);

        } catch (compressionError) {
            console.error('压缩失败:', compressionError);
            imageItem.querySelector('.compressed-size').textContent = '压缩失败';
            progressBar.remove();
        }

    } catch (error) {
        console.error('图片处理失败:', error);
        showToast('图片处理失败', 'error');
    }
}

// 工具函数
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}

async function getImageDimensions(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.src = url;
    });
}

function downloadImage(file, originalName) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(file);
    link.download = `compressed_${originalName}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 2000);
    }, 100);
} 