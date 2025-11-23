// 全局下载管理变量
let downloadQueue = [];
let currentDownload = null;
let downloadHistory = new Map(); // 用于断点续传

// 页面加载时检查权限
document.addEventListener('DOMContentLoaded', checkUserPermission);

// 音乐播放器功能
let currentMusicIndex = -1;
let musicList = [];
let isPlaying = false;
let lyricsData = [];
let currentLyricIndex = -1;

const audioPlayer = document.getElementById('audio-player');
const playBtn = document.getElementById('play-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const currentSong = document.querySelector('.current-song');
const playerStatus = document.querySelector('.player-status');
const progress = document.getElementById('progress');
const musicListElement = document.getElementById('music-list');
const currentTimeElement = document.getElementById('current-time');
const totalTimeElement = document.getElementById('total-time');
const lyricsContent = document.getElementById('lyrics-content');

// 格式化时间为 MM:SS 格式
function formatTime(seconds) {
    if (isNaN(seconds) || seconds === Infinity) {
        return '**:**';
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// 更新当前时间和总时长显示
function updateTimeDisplay() {
    currentTimeElement.textContent = formatTime(audioPlayer.currentTime);
    totalTimeElement.textContent = formatTime(audioPlayer.duration);
}

// 解析歌词时间格式 [mm:ss.xx]
function parseLyricTime(timeStr) {
    const match = timeStr.match(/\[(\d+):(\d+)\.(\d+)\]/);
    if (match) {
        const minutes = parseInt(match[1]);
        const seconds = parseInt(match[2]);
        const milliseconds = parseInt(match[3]);
        return minutes * 60 + seconds + milliseconds / 100;
    }
    return 0;
}

// 解析歌词文件
function parseLyrics(lyricsText) {
    const lines = lyricsText.split('\n');
    const lyrics = [];

    lines.forEach(line => {
        line = line.trim();
        if (!line) return; // 跳过空行

        // 修复正则表达式：支持 [mm:ss.xx] 格式
        const match = line.match(/^\[(\d+):(\d+)\.(\d+)\](.*)$/);
        if (match) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            const milliseconds = parseInt(match[3]);
            const text = match[4].trim();

            if (text) { // 只添加有歌词内容的行
                const timeInSeconds = minutes * 60 + seconds + milliseconds / 100;
                lyrics.push({
                    time: timeInSeconds,
                    text: text,
                    original: line
                });
            }
        } else {
            // 调试：输出无法解析的行
            console.log('无法解析的歌词行:', line);
        }
    });

    // 按时间排序
    lyrics.sort((a, b) => a.time - b.time);
    console.log('解析后的歌词数据:', lyrics);
    return lyrics;
}

// 更新歌词显示
function updateLyrics(currentTime) {
    // 找到当前时间对应的歌词
    let newIndex = -1;
    for (let i = lyricsData.length - 1; i >= 0; i--) {
        if (currentTime >= lyricsData[i].time) {
            newIndex = i;
            break;
        }
    }

    // 如果歌词索引没有变化，不需要更新
    if (newIndex === currentLyricIndex) return;

    currentLyricIndex = newIndex;

    // 生成歌词HTML
    const lyricsHTML = lyricsData.map((lyric, index) => {
        const isCurrent = index === currentLyricIndex;
        const className = isCurrent ? 'lyric-current' : 'lyric-normal';
        return `<div class="${className}" data-time="${lyric.time}" onclick="seekToLyricTime(${lyric.time})">${lyric.text}</div>`;
    }).join('');

    lyricsContent.innerHTML = lyricsHTML;

    // 歌词追踪功能：使用最简单可靠的方法
    if (currentLyricIndex >= 0) {
        // 使用setTimeout确保DOM更新完成
        setTimeout(() => {
            const currentLyricElement = lyricsContent.children[currentLyricIndex];
            if (currentLyricElement) {
                // 最简单的方法：使用scrollIntoView，但只针对歌词容器
                currentLyricElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'nearest'
                });
            }
        }, 50);
    }
}

// 删除复杂的scrollLyricToCenter函数
// 点击歌词跳转到对应时间
function seekToLyricTime(time) {
    if (audioPlayer.duration) {
        audioPlayer.currentTime = time;
        // 如果音频暂停，自动播放
        if (audioPlayer.paused) {
            audioPlayer.play();
            isPlaying = true;
            playBtn.textContent = '||';
            playerStatus.textContent = '播放中';
        }
    }
}

// 加载歌词
async function loadLyrics(lyricsPath) {
    if (lyricsPath === '[NO DATA]') {
        lyricsContent.innerHTML = '<div class="lyric-normal">暂无歌词</div>';
        lyricsData = [];
        currentLyricIndex = -1;
        return;
    }

    try {
        // 修复路径分隔符问题：将Windows风格的反斜杠转换为URL风格的斜杠
        const normalizedPath = lyricsPath.replace(/\\/g, '/');
        console.log('加载歌词文件:', normalizedPath);
        const response = await fetch(normalizedPath);
        if (!response.ok) {
            throw new Error('歌词文件不存在');
        }
        const lyricsText = await response.text();
        console.log('歌词文件内容:', lyricsText);
        lyricsData = parseLyrics(lyricsText);
        currentLyricIndex = -1;

        if (lyricsData.length === 0) {
            lyricsContent.innerHTML = '<div class="lyric-normal">暂无歌词</div>';
        } else {
            // 显示所有歌词（不按时间高亮）
            const lyricsHTML = lyricsData.map(lyric =>
                `<div class="lyric-normal" data-time="${lyric.time}" onclick="seekToLyricTime(${lyric.time})">${lyric.text}</div>`
            ).join('');
            lyricsContent.innerHTML = lyricsHTML;
        }
    } catch (error) {
        console.error('加载歌词失败:', error);
        lyricsContent.innerHTML = '<div class="lyric-normal">暂无歌词</div>';
        lyricsData = [];
        currentLyricIndex = -1;
    }
}

// 渲染音乐列表
function renderMusicList() {
    musicListElement.innerHTML = '';
    const isVIP = isVIPUser();

    musicList.forEach((music, index) => {
        const parts = music.split(' \\ ');
        const name = parts[0];
        const location = parts[1];
        const lyricsPath = parts[2];
        const vipStatus = parts[3] || 'UR'; // 默认为免费音乐

        const li = document.createElement('li');
        li.className = 'music-item';

        // 添加VIP标识
        if (vipStatus === 'VIP') {
            li.style.backgroundColor = '#fff3cd'; // VIP黄色背景
            li.style.borderLeft = '4px solid #ffc107'; // VIP标识边框
            li.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                            <span>${name}</span>
                            <span style="background-color: #ffc107; color: #856404; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">VIP专属</span>
                        </div>
                    `;
        } else {
            // 非VIP音乐：为VIP用户添加下载按钮
            if (isVIP) {
                li.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                                <span>${name}</span>
                                <button class="download-btn" onclick="downloadMusic(${index}, event)" 
                                        style="background-color: #28a745; color: white; border: none; padding: 4px 12px; border-radius: 4px; font-size: 12px; cursor: pointer;">
                                    下载
                                </button>
                            </div>
                            <div class="download-progress-container" id="download-progress-${index}" style="display: none;">
                                <div class="download-progress-bar">
                                    <div class="download-progress" id="download-progress-bar-${index}"></div>
                                </div>
                                <div class="download-progress-text" id="download-progress-text-${index}">0%</div>
                            </div>
                            <div class="connection-nodes" id="connection-nodes-${index}" style="display: none;">
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                            </div>
                            <div class="download-info-container" id="download-info-${index}" style="display: none;">
                                <div class="download-info-item">
                                    <span class="download-info-label">速度:</span>
                                    <span class="download-info-value" id="download-speed-${index}">0 KB/s</span>
                                </div>
                                <div class="download-info-item">
                                    <span class="download-info-label">剩余:</span>
                                    <span class="download-info-value" id="download-eta-${index}">--:--</span>
                                </div>
                                <div class="download-info-item">
                                    <span class="download-info-label">已下载:</span>
                                    <span class="download-info-value" id="download-received-${index}">0 B</span>
                                </div>
                            </div>
                            <div class="download-status" id="download-status-${index}" style="display: none;"></div>
                        `;
            } else if (vipStatus === 'DL') {
                // DL标记的歌曲：为普通用户添加下载按钮（极慢速下载）
                li.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                                <span>${name}</span>
                                <button class="download-btn" onclick="downloadMusicForNormalUser(${index}, event)" 
                                        style="background-color: #17a2b8; color: white; border: none; padding: 4px 12px; border-radius: 4px; font-size: 12px; cursor: pointer;">
                                    下载（普通用户）
                                </button>
                            </div>
                            <div class="download-progress-container" id="download-progress-${index}" style="display: none;">
                                <div class="download-progress-bar">
                                    <div class="download-progress" id="download-progress-bar-${index}"></div>
                                </div>
                                <div class="download-progress-text" id="download-progress-text-${index}">0%</div>
                            </div>
                            <div class="connection-nodes" id="connection-nodes-${index}" style="display: none;">
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                            </div>
                            <div class="download-info-container" id="download-info-${index}" style="display: none;">
                                <div class="download-info-item">
                                    <span class="download-info-label">速度:</span>
                                    <span class="download-info-value" id="download-speed-${index}">0 KB/s</span>
                                </div>
                                <div class="download-info-item">
                                    <span class="download-info-label">剩余:</span>
                                    <span class="download-info-value" id="download-eta-${index}">--:--</span>
                                </div>
                                <div class="download-info-item">
                                    <span class="download-info-label">已下载:</span>
                                    <span class="download-info-value" id="download-received-${index}">0 B</span>
                                </div>
                            </div>
                            <div class="download-status" id="download-status-${index}" style="display: none;"></div>
                        `;
            } else {
                li.textContent = name;
            }
        }

        li.addEventListener('click', () => playMusic(index));
        musicListElement.appendChild(li);
    });
}

// 加载音乐列表数据
async function loadMusicList() {
    try {
        console.log('开始加载音乐列表数据...');
        const response = await fetch('./music.txt');
        if (!response.ok) {
            throw new Error('音乐列表文件不存在');
        }
        const musicText = await response.text();
        console.log('音乐列表文件内容:', musicText);

        // 按行分割，过滤空行
        musicList = musicText.split('\n')
            .filter(line => line.trim() !== '')
            .map(line => line.trim());

        console.log('解析后的音乐列表:', musicList);

        // 渲染音乐列表
        renderMusicList();
        console.log('音乐列表渲染完成，共加载', musicList.length, '首歌曲');
    } catch (error) {
        console.error('加载音乐列表失败:', error);
        musicListElement.innerHTML = '<li style="color: red; text-align: center;">加载音乐列表失败，请刷新页面重试</li>';
    }
}

// 检查用户是否为VIP或超级管理员
function isVIPUser() {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) return false;

    // 检查是否为ZC用户或管理员（视为VIP）
    const [typeCode, userId] = authToken.split('-');
    return typeCode === 'ZC' || userId === '13258227085';
}

// 检查用户是否为超级管理员
function isSuperAdmin() {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) return false;

    const [typeCode, userId] = authToken.split('-');
    return userId === '13258227085';
}

// VIP试听功能
let vipTrialTimer = null;
let isVipTrialMode = false; // 添加试听模式标识
let vipTrialMusicIndex = -1; // 试听的音乐索引

// 音频加载
async function loadAudioSecurely(location, isVIPMusic, isVIPUser) {
    try {
        // 显示加载提示和进度条
        showLoadingProgress('加载音乐中...', 0);

        // 对于非VIP用户的VIP音乐，使用简单的15秒限制
        if (isVIPMusic && !isVIPUser) {
            // 使用简单的Range请求限制为前15秒
            const response = await fetch(location, {
                headers: {
                    'Range': 'bytes=0-300000' // 约15秒的音频数据
                }
            });

            if (!response.ok) {
                hideLoadingProgress();
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const contentLength = parseInt(response.headers.get('content-length') || '285000');
            const audioData = await response.arrayBuffer();

            // 更新进度到100%
            updateLoadingProgress(100, '音频数据处理中...');

            const blob = new Blob([audioData], { type: 'audio/mpeg' });
            hideLoadingProgress();
            return URL.createObjectURL(blob);
        } else if (isVIPUser) {
            // VIP用户：直接使用音乐文件，不进行Blob转换
            hideLoadingProgress();
            return location; // 直接返回音乐文件路径
        } else {
            // 普通用户的免费音乐：使用带进度条的Blob方式
            const response = await fetch(location);

            if (!response.ok) {
                hideLoadingProgress();
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const contentLength = parseInt(response.headers.get('content-length') || '1000000');
            let loaded = 0;
            // 记录开始时间
            const startTime = Date.now();
            // 创建读取器来跟踪进度
            const reader = response.body.getReader();
            const chunks = [];
            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                chunks.push(value);
                loaded += value.length;

                // 计算进度百分比
                const progress = Math.min(Math.round((loaded / contentLength) * 100), 100);

                // 计算预估剩余时间（基于当前加载速度）
                const elapsedTime = Date.now() - startTime;
                const speed = loaded / (elapsedTime / 1000); // bytes per second
                const remainingBytes = contentLength - loaded;
                const remainingTime = speed > 0 ? Math.round(remainingBytes / speed) : 0;
                // 更新进度条
                updateLoadingProgress(progress, `加载中... 预估剩余时间: ${formatTime(remainingTime)}`);
            }
            // 合并所有chunks
            const audioData = new Uint8Array(loaded);
            let position = 0;
            for (const chunk of chunks) {
                audioData.set(chunk, position);
                position += chunk.length;
            }

            // 更新进度到100%
            updateLoadingProgress(100, '音频数据处理中...');

            const blob = new Blob([audioData], { type: 'audio/mpeg' });
            hideLoadingProgress();
            return URL.createObjectURL(blob);
        }
    } catch (error) {
        hideLoadingProgress();
        console.error('加载音频文件失败:', error);
        throw error;
    }
}

// 显示加载进度条
function showLoadingProgress(message, progress) {
    let progressContainer = document.getElementById('loading-progress-container');
    if (!progressContainer) {
        progressContainer = document.createElement('div');
        progressContainer.id = 'loading-progress-container';
        progressContainer.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0, 0, 0, 0.9);
                    color: white;
                    padding: 30px;
                    border-radius: 15px;
                    z-index: 10000;
                    font-size: 16px;
                    font-weight: bold;
                    min-width: 300px;
                    text-align: center;
                `;

        const messageElement = document.createElement('div');
        messageElement.id = 'loading-progress-message';
        messageElement.style.marginBottom = '15px';
        messageElement.textContent = message;

        const progressBarContainer = document.createElement('div');
        progressBarContainer.style.cssText = `
                    width: 100%;
                    height: 20px;
                    background: #333;
                    border-radius: 10px;
                    overflow: hidden;
                    margin-bottom: 10px;
                `;

        const progressBar = document.createElement('div');
        progressBar.id = 'loading-progress-bar';
        progressBar.style.cssText = `
                    height: 100%;
                    background: linear-gradient(90deg, #4CAF50, #45a049);
                    border-radius: 10px;
                    width: ${progress}%;
                    transition: width 0.3s ease;
                `;

        const progressText = document.createElement('div');
        progressText.id = 'loading-progress-text';
        progressText.style.cssText = `
                    font-size: 14px;
                    color: #ccc;
                `;
        progressText.textContent = `${progress}%`;

        const timeText = document.createElement('div');
        timeText.id = 'loading-time-text';
        timeText.style.cssText = `
                    font-size: 12px;
                    color: #999;
                    margin-top: 5px;
                `;

        progressBarContainer.appendChild(progressBar);
        progressContainer.appendChild(messageElement);
        progressContainer.appendChild(progressBarContainer);
        progressContainer.appendChild(progressText);
        progressContainer.appendChild(timeText);
        document.body.appendChild(progressContainer);
    }

    document.getElementById('loading-progress-message').textContent = message;
    document.getElementById('loading-progress-bar').style.width = `${progress}%`;
    document.getElementById('loading-progress-text').textContent = `${progress}%`;
    progressContainer.style.display = 'block';

    // 记录开始时间
    window.loadingStartTime = Date.now();
}

// 更新加载进度
function updateLoadingProgress(progress, message) {
    const progressContainer = document.getElementById('loading-progress-container');
    if (!progressContainer) return;

    if (message) {
        document.getElementById('loading-progress-message').textContent = message;
    }

    document.getElementById('loading-progress-bar').style.width = `${progress}%`;
    document.getElementById('loading-progress-text').textContent = `${progress}%`;

    // 更新预估时间
    if (progress > 0) {
        const elapsedTime = Date.now() - window.loadingStartTime;
        const totalEstimatedTime = (elapsedTime / progress) * 100;
        const remainingTime = totalEstimatedTime - elapsedTime;

        const timeText = document.getElementById('loading-time-text');
        if (timeText) {
            timeText.textContent = `预估剩余时间: ${formatTime(Math.max(0, Math.round(remainingTime / 1000)))}`;
        }
    }
}

// 隐藏加载进度条
function hideLoadingProgress() {
    const progressContainer = document.getElementById('loading-progress-container');
    if (progressContainer) {
        progressContainer.style.display = 'none';
    }
}

// 格式化时间（秒转换为时分秒）
function formatTime(seconds) {
    if (seconds < 60) {
        return `${seconds}秒`;
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}分${remainingSeconds}秒`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}时${minutes}分`;
    }
}

// 显示加载提示（兼容旧代码）
function showLoadingMessage(message) {
    showLoadingProgress(message, 0);
}

// 隐藏加载提示（兼容旧代码）
function hideLoadingMessage() {
    hideLoadingProgress();
}

// 播放音乐
async function playMusic(index) {
    if (index < 0 || index >= musicList.length) return;

    const parts = musicList[index].split(' \\ ');
    const name = parts[0];
    const location = parts[1];
    const lyricsPath = parts[2];
    const vipStatus = parts[3] || 'UR';

    // 检查是否为VIP音乐且用户不是VIP
    if (vipStatus === 'VIP' && !isVIPUser()) {
        // 清除之前的试听定时器
        if (vipTrialTimer) {
            clearTimeout(vipTrialTimer);
            vipTrialTimer = null;
        }

        // 设置试听模式
        isVipTrialMode = true;
        vipTrialMusicIndex = index;

        try {
            // 简单加载音频（只加载前15秒）
            const secureUrl = await loadAudioSecurely(location, true, false);
            audioPlayer.src = secureUrl;

            currentMusicIndex = index;
            currentSong.textContent = name + ' (试听中...)';

            // 更新列表样式
            document.querySelectorAll('.music-item').forEach((item, i) => {
                item.classList.toggle('playing', i === index);
            });

            // 重置时间显示
            currentTimeElement.textContent = '00:00';
            totalTimeElement.textContent = '00:15';

            // 加载歌词
            loadLyrics(lyricsPath);

            // 播放音乐 - 添加用户交互来绕过自动播放限制
            const playPromise = audioPlayer.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    // 自动播放被阻止，需要用户交互
                    console.log('自动播放被阻止，需要用户点击播放按钮');
                    // 重置播放状态
                    isPlaying = false;
                    playBtn.textContent = '▶';
                    playerStatus.textContent = '点击播放开始试听';
                });
            } else {
                // 播放成功
                isPlaying = true;
                playBtn.textContent = '||';
                playerStatus.textContent = '试听中';
            }

            // 设置15秒试听定时器
            vipTrialTimer = setTimeout(() => {
                // 暂停音乐
                audioPlayer.pause();
                isPlaying = false;
                playBtn.textContent = '▶';
                playerStatus.textContent = '试听结束';
                isVipTrialMode = false;

                // 显示VIP提示
                const confirmVIP = confirm('试听结束！这是VIP专属音乐，需要VIP才能完整收听。\n\n点击"确定"将自动播放下一首免费音乐。');

                if (confirmVIP) {
                    // 自动播放下一首免费音乐
                    playNextFreeMusic(index);
                    // 重置播放器状态
                    currentSong.textContent = '请选择一首歌曲';
                    playerStatus.textContent = '暂停中';
                    audioPlayer.src = '';
                    currentMusicIndex = -1;
                    vipTrialMusicIndex = -1;
                    document.querySelectorAll('.music-item').forEach(item => {
                        item.classList.remove('playing');
                    });
                }
            }, 15000);

            return;
        } catch (error) {
            alert('加载音乐失败，请重试');
            return;
        }
    }

    // 正常播放逻辑（免费音乐或VIP用户）
    isVipTrialMode = false;
    vipTrialMusicIndex = -1;

    try {
        // 加载完整音频
        const secureUrl = await loadAudioSecurely(location, false, isVIPUser());
        audioPlayer.src = secureUrl;

        currentMusicIndex = index;
        currentSong.textContent = name;

        // 更新列表样式
        document.querySelectorAll('.music-item').forEach((item, i) => {
            item.classList.toggle('playing', i === index);
        });

        currentTimeElement.textContent = '00:00';
        totalTimeElement.textContent = '**:**';

        // 加载歌词
        loadLyrics(lyricsPath);

        // 播放音乐 - 添加用户交互来绕过自动播放限制
        const playPromise = audioPlayer.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                // 播放成功
                isPlaying = true;
                playBtn.textContent = '||';
                playerStatus.textContent = '播放中';
            }).catch(error => {
                // 自动播放被阻止，需要用户交互
                console.log('自动播放被阻止，需要用户点击播放按钮');
                // 重置播放状态
                isPlaying = false;
                playBtn.textContent = '▶';
                playerStatus.textContent = '点击播放开始收听';
            });
        } else {
            // 播放成功（旧版浏览器）
            isPlaying = true;
            playBtn.textContent = '||';
            playerStatus.textContent = '播放中';
        }
    } catch (error) {
        alert('加载音乐失败，请重试');
    }
}

// 播放下一首免费音乐
function playNextFreeMusic(currentIndex) {
    let nextIndex = currentIndex + 1;
    let foundFreeMusic = false;

    // 从当前位置向后查找免费音乐
    for (let i = nextIndex; i < musicList.length; i++) {
        const parts = musicList[i].split(' \\ ');
        const vipStatus = parts[3] || 'UR';
        if (vipStatus !== 'VIP') {
            playMusic(i);
            foundFreeMusic = true;
            break;
        }
    }

    // 如果后面没有免费音乐，从开头查找
    if (!foundFreeMusic) {
        for (let i = 0; i < currentIndex; i++) {
            const parts = musicList[i].split(' \\ ');
            const vipStatus = parts[3] || 'UR';
            if (vipStatus !== 'VIP') {
                playMusic(i);
                foundFreeMusic = true;
                break;
            }
        }
    }

    // 如果整个列表都没有免费音乐
    if (!foundFreeMusic) {
        alert('很抱歉，当前没有可播放的免费音乐。');
        audioPlayer.pause();
        isPlaying = false;
        playBtn.textContent = '▶';
        playerStatus.textContent = '暂停中';
        currentSong.textContent = '请选择一首歌曲';
        document.querySelectorAll('.music-item').forEach(item => {
            item.classList.remove('playing');
        });
    }
}

// 获取可播放的音乐索引（跳过VIP音乐，非VIP用户）
function getNextPlayableIndex(currentIndex, direction) {
    let newIndex = currentIndex;
    const totalSongs = musicList.length;
    let attempts = 0;

    do {
        if (direction === 'next') {
            newIndex = (newIndex + 1) % totalSongs;
        } else {
            newIndex = (newIndex - 1 + totalSongs) % totalSongs;
        }

        // 检查是否回到起点（避免无限循环）
        if (newIndex === currentIndex) {
            return -1; // 没有可播放的音乐
        }

        const parts = musicList[newIndex].split(' \\ ');
        const vipStatus = parts[3] || 'UR';
        // 如果是VIP用户或者不是VIP音乐，可以播放
        if (isVIPUser() || vipStatus !== 'VIP') {
            return newIndex;
        }

        attempts++;
        // 防止无限循环
        if (attempts > totalSongs) {
            return -1;
        }
    } while (true);
}

// 播放/暂停控制
playBtn.addEventListener('click', async () => {
    if (currentMusicIndex === -1 && musicList.length > 0) {
        // 如果是第一次播放，找到第一首可播放的音乐
        let firstPlayableIndex = -1;
        for (let i = 0; i < musicList.length; i++) {
            const parts = musicList[i].split(' \\ ');
            const vipStatus = parts[3] || 'UR';
            if (isVIPUser() || vipStatus !== 'VIP') {
                firstPlayableIndex = i;
                break;
            }
        }

        if (firstPlayableIndex !== -1) {
            await playMusic(firstPlayableIndex);
        } else {
            alert('没有可播放的免费音乐');
        }
        return;
    }

    // 检查当前音乐是否为VIP音乐且用户不是VIP
    if (currentMusicIndex !== -1) {
        const parts = musicList[currentMusicIndex].split(' \\ ');
        const vipStatus = parts[3] || 'UR';
        if (vipStatus === 'VIP' && !isVIPUser()) {
            alert('这是VIP专属音乐，需要VIP才能完整收听');
            return;
        }
    }

    if (isPlaying) {
        audioPlayer.pause();
        playBtn.textContent = '▶';
        playerStatus.textContent = '暂停中';
    } else {
        audioPlayer.play();
        playBtn.textContent = '||';
        playerStatus.textContent = '播放中';
    }
    isPlaying = !isPlaying;
});

// 上一首
prevBtn.addEventListener('click', async () => {
    if (musicList.length === 0) return;
    const nextIndex = getNextPlayableIndex(currentMusicIndex, 'prev');
    if (nextIndex !== -1) {
        await playMusic(nextIndex);
    } else {
        alert('没有可播放的免费音乐');
    }
});

// 下一首
nextBtn.addEventListener('click', async () => {
    if (musicList.length === 0) return;
    const nextIndex = getNextPlayableIndex(currentMusicIndex, 'next');
    if (nextIndex !== -1) {
        await playMusic(nextIndex);
    } else {
        alert('没有可播放的免费音乐');
    }
});

// 更新进度条和时间显示
audioPlayer.addEventListener('timeupdate', () => {
    if (isVipTrialMode && vipTrialMusicIndex !== -1) {
        // 试听模式：限制在15秒内
        const maxTrialTime = 15; // 15秒试听
        const currentTime = Math.min(audioPlayer.currentTime, maxTrialTime);

        // 如果超过15秒，自动暂停
        if (audioPlayer.currentTime >= maxTrialTime) {
            audioPlayer.pause();
            audioPlayer.currentTime = 0; // 重置到开头
            isPlaying = false;
            playBtn.textContent = '▶';
            playerStatus.textContent = '试听结束';

            // 显示VIP提示
            const confirmVIP = confirm('试听结束！这是VIP专属音乐，需要VIP才能完整收听。\n\n点击"确定"将自动播放下一首免费音乐。');

            if (confirmVIP) {
                playNextFreeMusic(vipTrialMusicIndex);
            } else {
                currentSong.textContent = '请选择一首歌曲';
                playerStatus.textContent = '暂停中';
                audioPlayer.src = '';
                currentMusicIndex = -1;
                vipTrialMusicIndex = -1;
                isVipTrialMode = false;
                document.querySelectorAll('.music-item').forEach(item => {
                    item.classList.remove('playing');
                });
            }
            return;
        }

        // 更新进度条（基于15秒范围）
        const progressPercent = (currentTime / maxTrialTime) * 100;
        progress.style.width = progressPercent + '%';

        // 更新时间显示
        const minutes = Math.floor(currentTime / 60);
        const seconds = Math.floor(currentTime % 60);
        currentTimeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        totalTimeElement.textContent = '00:15'; // 固定显示15秒
    } else {
        // 正常模式
        const progressPercent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progress.style.width = progressPercent + '%';
        updateTimeDisplay();
    }

    // 更新歌词显示
    updateLyrics(audioPlayer.currentTime);
});

// 点击进度条跳转
document.querySelector('.progress-bar').addEventListener('click', (e) => {
    if (isVipTrialMode && vipTrialMusicIndex !== -1) {
        // 试听模式：只能在15秒范围内跳转
        const rect = e.target.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const maxTrialTime = 15; // 15秒试听

        // 计算跳转时间（限制在15秒内）
        const newTime = Math.min((clickX / width) * maxTrialTime, maxTrialTime);
        audioPlayer.currentTime = newTime;
    } else {
        // 正常模式
        const rect = e.target.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const duration = audioPlayer.duration;

        if (duration) {
            audioPlayer.currentTime = (clickX / width) * duration;
        }
    }
});

// 歌曲结束自动下一首
audioPlayer.addEventListener('ended', () => {
    if (musicList.length === 0) return;
    const nextIndex = getNextPlayableIndex(currentMusicIndex, 'next');
    if (nextIndex !== -1) {
        playMusic(nextIndex);
    }
});

// 当音频元数据加载完成时更新总时长
audioPlayer.addEventListener('loadedmetadata', () => {
    updateTimeDisplay();
});

// 页面加载完成后初始化音乐列表
document.addEventListener('DOMContentLoaded', () => {
    loadMusicList();
});

// 搜索功能
document.getElementById('search').addEventListener('submit', function (e) {
    e.preventDefault();
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();

    if (!searchTerm) {
        // 如果搜索框为空，显示所有音乐
        renderMusicList();
        return;
    }

    // 过滤音乐列表
    const filteredList = musicList.filter(music => {
        const name = music.split(' \\ ')[0].toLowerCase();
        return name.includes(searchTerm);
    });

    // 渲染过滤后的列表
    musicListElement.innerHTML = '';
    const isVIP = isVIPUser();
    const isSuperAdminUser = isSuperAdmin();

    filteredList.forEach((music, index) => {
        const parts = music.split(' \\ ');
        const name = parts[0];
        const location = parts[1];
        const lyricsPath = parts[2];
        const vipStatus = parts[3] || 'UR';

        const li = document.createElement('li');
        li.className = 'music-item';

        // 添加VIP标识
        if (vipStatus === 'VIP') {
            li.style.backgroundColor = '#fff3cd';
            li.style.borderLeft = '4px solid #ffc107';

            // 超级管理员可以下载VIP歌曲
            if (isSuperAdminUser) {
                li.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                                <span>${name}</span>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="background-color: #ffc107; color: #856404; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">VIP专属</span>
                                    <button class="download-btn" onclick="downloadMusic(${index}, event)" 
                                            style="background-color: #dc3545; color: white; border: none; padding: 4px 12px; border-radius: 4px; font-size: 12px; cursor: pointer;">
                                        管理员下载
                                    </button>
                                </div>
                            </div>
                            <div class="download-progress-container" id="download-progress-${index}" style="display: none;">
                                <div class="download-progress-bar">
                                    <div class="download-progress" id="download-progress-bar-${index}"></div>
                                </div>
                                <div class="download-progress-text" id="download-progress-text-${index}">0%</div>
                            </div>
                            <div class="connection-nodes" id="connection-nodes-${index}" style="display: none;">
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                            </div>
                            <div class="download-info-container" id="download-info-${index}" style="display: none;">
                                <div class="download-info-item">
                                    <span class="download-info-label">速度:</span>
                                    <span class="download-info-value" id="download-speed-${index}">0 KB/s</span>
                                </div>
                                <div class="download-info-item">
                                    <span class="download-info-label">剩余:</span>
                                    <span class="download-info-value" id="download-eta-${index}">--:--</span>
                                </div>
                                <div class="download-info-item">
                                    <span class="download-info-label">已下载:</span>
                                    <span class="download-info-value" id="download-received-${index}">0 B</span>
                                </div>
                            </div>
                            <div class="download-status" id="download-status-${index}" style="display: none;"></div>
                        `;
            } else {
                li.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                                <span>${name}</span>
                                <span style="background-color: #ffc107; color: #856404; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">VIP专属</span>
                            </div>
                        `;
            }
        } else if (vipStatus === 'DL') {
            // DL标记的歌曲：为普通用户添加下载按钮（极慢速下载），但超级管理员使用专业下载
            if (isSuperAdminUser) {
                // 超级管理员使用专业下载
                li.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                                <span>${name}</span>
                                <button class="download-btn" onclick="downloadMusic(${index}, event)" 
                                        style="background-color: #28a745; color: white; border: none; padding: 4px 12px; border-radius: 4px; font-size: 12px; cursor: pointer;">
                                    下载
                                </button>
                            </div>
                            <div class="download-progress-container" id="download-progress-${index}" style="display: none;">
                                <div class="download-progress-bar">
                                    <div class="download-progress" id="download-progress-bar-${index}"></div>
                                </div>
                                <div class="download-progress-text" id="download-progress-text-${index}">0%</div>
                            </div>
                            <div class="connection-nodes" id="connection-nodes-${index}" style="display: none;">
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                            </div>
                            <div class="download-info-container" id="download-info-${index}" style="display: none;">
                                <div class="download-info-item">
                                    <span class="download-info-label">速度:</span>
                                    <span class="download-info-value" id="download-speed-${index}">0 KB/s</span>
                                </div>
                                <div class="download-info-item">
                                    <span class="download-info-label">剩余:</span>
                                    <span class="download-info-value" id="download-eta-${index}">--:--</span>
                                </div>
                                <div class="download-info-item">
                                    <span class="download-info-label">已下载:</span>
                                    <span class="download-info-value" id="download-received-${index}">0 B</span>
                                </div>
                            </div>
                            <div class="download-status" id="download-status-${index}" style="display: none;"></div>
                        `;
            } else {
                // 普通用户使用极慢速下载
                li.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                                <span>${name}</span>
                                <button class="download-btn" onclick="downloadMusicForNormalUser(${index}, event)" 
                                        style="background-color: #17a2b8; color: white; border: none; padding: 4px 12px; border-radius: 4px; font-size: 12px; cursor: pointer;">
                                    下载（普通用户）
                                </button>
                            </div>
                            <div class="download-progress-container" id="download-progress-${index}" style="display: none;">
                                <div class="download-progress-bar">
                                    <div class="download-progress" id="download-progress-bar-${index}"></div>
                                </div>
                                <div class="download-progress-text" id="download-progress-text-${index}">0%</div>
                            </div>
                            <div class="connection-nodes" id="connection-nodes-${index}" style="display: none;">
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                            </div>
                            <div class="download-info-container" id="download-info-${index}" style="display: none;">
                                <div class="download-info-item">
                                    <span class="download-info-label">速度:</span>
                                    <span class="download-info-value" id="download-speed-${index}">0 KB/s</span>
                                </div>
                                <div class="download-info-item">
                                    <span class="download-info-label">剩余:</span>
                                    <span class="download-info-value" id="download-eta-${index}">--:--</span>
                                </div>
                                <div class="download-info-item">
                                    <span class="download-info-label">已下载:</span>
                                    <span class="download-info-value" id="download-received-${index}">0 B</span>
                                </div>
                            </div>
                            <div class="download-status" id="download-status-${index}" style="display: none;"></div>
                        `;
            }
        } else if (isVIP || isSuperAdminUser) {
            // 非VIP音乐：为VIP用户或超级管理员添加下载按钮
            li.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                            <span>${name}</span>
                            <button class="download-btn" onclick="downloadMusic(${index}, event)" 
                                    style="background-color: #28a745; color: white; border: none; padding: 4px 12px; border-radius: 4px; font-size: 12px; cursor: pointer;">
                                下载
                            </button>
                        </div>
                        <div class="download-progress-container" id="download-progress-${index}" style="display: none;">
                            <div class="download-progress-bar">
                                <div class="download-progress" id="download-progress-bar-${index}"></div>
                            </div>
                            <div class="download-progress-text" id="download-progress-text-${index}">0%</div>
                        </div>
                        <div class="connection-nodes" id="connection-nodes-${index}" style="display: none;">
                            <div class="connection-node"></div>
                            <div class="connection-node"></div>
                            <div class="connection-node"></div>
                            <div class="connection-node"></div>
                            <div class="connection-node"></div>
                        </div>
                        <div class="download-info-container" id="download-info-${index}" style="display: none;">
                            <div class="download-info-item">
                                <span class="download-info-label">速度:</span>
                                <span class="download-info-value" id="download-speed-${index}">0 KB/s</span>
                            </div>
                            <div class="download-info-item">
                                <span class="download-info-label">剩余:</span>
                                <span class="download-info-value" id="download-eta-${index}">--:--</span>
                            </div>
                            <div class="download-info-item">
                                <span class="download-info-label">已下载:</span>
                                <span class="download-info-value" id="download-received-${index}">0 B</span>
                            </div>
                        </div>
                        <div class="download-status" id="download-status-${index}" style="display: none;"></div>
                    `;
        } else {
            li.textContent = name;
        }

        // 找到原始索引
        const originalIndex = musicList.indexOf(music);
        li.addEventListener('click', () => playMusic(originalIndex));
        musicListElement.appendChild(li);
    });
});

// 生成数学验证码
function generateMathCaptcha() {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operators = ['+', '-', '*'];
    const operator = operators[Math.floor(Math.random() * operators.length)];

    let answer;
    switch (operator) {
        case '+': answer = num1 + num2; break;
        case '-': answer = num1 - num2; break;
        case '*': answer = num1 * num2; break;
    }

    return {
        question: `请输入验证码：${num1} ${operator} ${num2} = ?`,
        answer: answer
    };
}

// 专业下载功能（包含速度显示、剩余时间、断点续传、多文件队列）
async function downloadMusic(index, event) {
    event.stopPropagation();

    // 人机验证
    const captcha = generateMathCaptcha();
    const userInput = prompt(captcha.question);

    if (parseInt(userInput) !== captcha.answer) {
        alert('验证失败，请重试下载');
        return;
    }

    // 原有下载逻辑...
    const parts = musicList[index].split(' \\ ');
    const name = parts[0];
    const location = parts[1];
    const vipStatus = parts[3] || 'UR';
    const button = event.target;
    const progressContainer = document.getElementById(`download-progress-${index}`);
    const progressBar = document.getElementById(`download-progress-bar-${index}`);
    const progressText = document.getElementById(`download-progress-text-${index}`);
    const statusText = document.getElementById(`download-status-${index}`);
    const connectionNodes = document.getElementById(`connection-nodes-${index}`);
    const downloadInfo = document.getElementById(`download-info-${index}`);
    const downloadSpeed = document.getElementById(`download-speed-${index}`);
    const downloadEta = document.getElementById(`download-eta-${index}`);
    const downloadReceived = document.getElementById(`download-received-${index}`);

    // 检查用户权限
    if (!isVIPUser() && !isSuperAdmin()) {
        alert('只有VIP用户或超级管理员才能下载音乐！');
        return;
    }

    // 如果是VIP歌曲且用户不是超级管理员，需要检查VIP权限
    if (vipStatus === 'VIP' && !isSuperAdmin()) {
        alert('这是VIP专属音乐，只有VIP用户或超级管理员才能下载！');
        return;
    }

    // 添加到下载队列
    addToDownloadQueue(index, name, location);
}

// 普通用户极慢速下载功能（仅限DL标记的歌曲）
async function downloadMusicForNormalUser(index, event) {
    event.stopPropagation();

    // 人机验证
    const captcha = generateMathCaptcha();
    const userInput = prompt(captcha.question);

    if (parseInt(userInput) !== captcha.answer) {
        alert('验证失败，请重试下载');
        return;
    }

    // 原有下载逻辑...
    const parts = musicList[index].split(' \\ ');
    const name = parts[0];
    const location = parts[1];
    const vipStatus = parts[3] || 'UR';
    const button = event.target;
    const progressContainer = document.getElementById(`download-progress-${index}`);
    const progressBar = document.getElementById(`download-progress-bar-${index}`);
    const progressText = document.getElementById(`download-progress-text-${index}`);
    const statusText = document.getElementById(`download-status-${index}`);
    const connectionNodes = document.getElementById(`connection-nodes-${index}`);
    const downloadInfo = document.getElementById(`download-info-${index}`);
    const downloadSpeed = document.getElementById(`download-speed-${index}`);
    const downloadEta = document.getElementById(`download-eta-${index}`);
    const downloadReceived = document.getElementById(`download-received-${index}`);

    // 检查是否为DL标记的歌曲
    if (vipStatus !== 'DL') {
        alert('只有标记为DL的歌曲才允许普通用户下载！');
        return;
    }

    // 检查用户权限（普通用户不能下载VIP歌曲）
    if (isVIPUser()) {
        alert('VIP用户请使用VIP下载功能！');
        return;
    }

    // 显示所有元素
    button.disabled = true;
    button.textContent = '准备下载...';
    progressContainer.style.display = 'flex';
    connectionNodes.style.display = 'flex';
    downloadInfo.style.display = 'flex';
    statusText.style.display = 'block';
    statusText.textContent = '正在连接服务器...';

    try {
        // 百度网盘级别初始延迟：10-20秒
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10000 + 10000));

        // 初始连接失败概率：15%概率连接失败
        if (Math.random() < 0.15) {
            throw new Error('服务器连接失败，请重试');
        }

        // 获取文件信息
        const response = await fetch(location, { method: 'HEAD' });
        if (!response.ok) throw new Error('无法获取文件信息');

        const contentLength = response.headers.get('content-length');
        const totalSize = contentLength ? parseInt(contentLength) : 0;

        statusText.textContent = `文件大小: ${formatFileSize(totalSize)}`;

        // 开始百度网盘级别慢速下载
        const downloadResponse = await fetch(location);
        if (!downloadResponse.ok) throw new Error(`下载失败: ${downloadResponse.status}`);

        const reader = downloadResponse.body.getReader();
        const chunks = [];
        let receivedLength = 0;
        let lastUpdateTime = Date.now();
        let lastReceivedLength = 0;

        // 更新连接节点状态（百度网盘级别慢动画）
        let nodeIndex = 0;
        const nodeInterval = setInterval(() => {
            const nodes = connectionNodes.querySelectorAll('.connection-node');
            nodes[nodeIndex].classList.add('inactive');
            nodeIndex = (nodeIndex + 1) % nodes.length;
            nodes[nodeIndex].classList.remove('inactive');
        }, 3000); // 百度网盘级别的慢动画

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            chunks.push(value);
            receivedLength += value.length;

            // 百度网盘级别慢速：每次读取后延迟3000-8000ms
            await new Promise(resolve => setTimeout(resolve, Math.random() * 5000 + 3000));

            // 随机卡顿：40%概率暂停5-10秒（百度网盘级别）
            if (Math.random() < 0.4) {
                statusText.textContent = '网络连接不稳定，重新连接中...';
                await new Promise(resolve => setTimeout(resolve, Math.random() * 5000 + 5000));
                statusText.textContent = '连接恢复，继续下载...';
            }

            // 额外随机延迟：30%概率额外延迟3-6秒
            if (Math.random() < 0.3) {
                statusText.textContent = '服务器繁忙，请稍候...';
                await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 3000));
                statusText.textContent = '继续下载...';
            }

            // 百度网盘特色：10%概率完全停止下载10-20秒
            if (Math.random() < 0.1) {
                statusText.textContent = '下载服务受限，请等待...';
                await new Promise(resolve => setTimeout(resolve, Math.random() * 10000 + 10000));
                statusText.textContent = '服务恢复，继续下载...';
            }

            // 下载过程中失败概率：20%概率下载中断
            if (Math.random() < 0.2) {
                throw new Error('网络连接中断，下载失败');
            }

            // 服务器错误概率：10%概率服务器错误
            if (Math.random() < 0.1) {
                throw new Error('服务器内部错误，请稍后重试');
            }

            // 文件损坏概率：5%概率文件损坏
            if (Math.random() < 0.05) {
                throw new Error('文件下载损坏，请重新下载');
            }

            // 计算下载速度（百度网盘级别极慢速）
            const currentTime = Date.now();
            const timeDiff = (currentTime - lastUpdateTime) / 1000; // 秒

            if (timeDiff >= 5) { // 每5秒更新一次速度（更慢）
                const bytesDiff = receivedLength - lastReceivedLength;
                const speed = bytesDiff / timeDiff; // 字节/秒

                // 强制限制速度在0-108B/s之间（百度网盘级别）
                const limitedSpeed = Math.max(0, Math.min(108, speed));

                // 更新速度显示
                downloadSpeed.textContent = `${formatSpeed(limitedSpeed)}`;
                downloadReceived.textContent = formatFileSize(receivedLength);

                // 计算剩余时间（基于极慢速）
                if (limitedSpeed > 0 && totalSize > 0) {
                    const remainingBytes = totalSize - receivedLength;
                    const remainingSeconds = remainingBytes / limitedSpeed;
                    downloadEta.textContent = formatTime(remainingSeconds);
                }

                lastUpdateTime = currentTime;
                lastReceivedLength = receivedLength;
            }

            // 更新进度
            if (totalSize > 0) {
                const progress = Math.round((receivedLength / totalSize) * 100);
                progressBar.style.width = `${progress}%`;
                progressText.textContent = `${progress}%`;

                // 更新状态信息（显示百度网盘级别慢速）
                statusText.textContent = `下载中... 速度极慢，请耐心等待 (${formatSpeed(Math.random() * 108)})`;
            }
        }

        clearInterval(nodeInterval);

        // 完成下载前的延迟（更长）
        statusText.textContent = '下载完成，正在处理文件...';
        await new Promise(resolve => setTimeout(resolve, 10000));

        // 完成下载
        const blob = new Blob(chunks);
        const url = URL.createObjectURL(blob);

        // 创建下载链接
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // 更新状态
        progressBar.style.width = '100%';
        progressText.textContent = '100%';
        statusText.textContent = '下载完成！';
        statusText.style.color = '#28a745';

        const nodes = connectionNodes.querySelectorAll('.connection-node');
        nodes.forEach(node => node.classList.add('inactive'));

        // 15秒后隐藏（更长）
        setTimeout(() => {
            progressContainer.style.display = 'none';
            connectionNodes.style.display = 'none';
            downloadInfo.style.display = 'none';
            statusText.style.display = 'none';
            button.disabled = false;
            button.textContent = '下载（普通用户）';
        }, 15000);

    } catch (error) {
        console.error('下载失败:', error);

        progressBar.style.background = '#dc3545';
        statusText.textContent = `下载失败: ${error.message}`;
        statusText.style.color = '#dc3545';

        setTimeout(() => {
            progressContainer.style.display = 'none';
            connectionNodes.style.display = 'none';
            downloadInfo.style.display = 'none';
            statusText.style.display = 'none';
            button.disabled = false;
            button.textContent = '下载（普通用户）';
        }, 4000);
    }
}

// 渲染音乐列表
function renderMusicList() {
    musicListElement.innerHTML = '';
    const isVIP = isVIPUser();
    const isSuperAdminUser = isSuperAdmin();

    musicList.forEach((music, index) => {
        const parts = music.split(' \\ ');
        const name = parts[0];
        const location = parts[1];
        const lyricsPath = parts[2];
        const vipStatus = parts[3] || 'UR'; // 默认为免费音乐

        const li = document.createElement('li');
        li.className = 'music-item';

        // 添加VIP标识
        if (vipStatus === 'VIP') {
            li.style.backgroundColor = '#fff3cd'; // VIP黄色背景
            li.style.borderLeft = '4px solid #ffc107'; // VIP标识边框

            // 超级管理员可以下载VIP歌曲
            if (isSuperAdminUser) {
                li.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                                <span>${name}</span>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="background-color: #ffc107; color: #856404; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">VIP专属</span>
                                    <button class="download-btn" onclick="downloadMusic(${index}, event)" 
                                            style="background-color: #dc3545; color: white; border: none; padding: 4px 12px; border-radius: 4px; font-size: 12px; cursor: pointer;">
                                        管理员下载
                                    </button>
                                </div>
                            </div>
                            <div class="download-progress-container" id="download-progress-${index}" style="display: none;">
                                <div class="download-progress-bar">
                                    <div class="download-progress" id="download-progress-bar-${index}"></div>
                                </div>
                                <div class="download-progress-text" id="download-progress-text-${index}">0%</div>
                            </div>
                            <div class="connection-nodes" id="connection-nodes-${index}" style="display: none;">
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                            </div>
                            <div class="download-info-container" id="download-info-${index}" style="display: none;">
                                <div class="download-info-item">
                                    <span class="download-info-label">速度:</span>
                                    <span class="download-info-value" id="download-speed-${index}">0 KB/s</span>
                                </div>
                                <div class="download-info-item">
                                    <span class="download-info-label">剩余:</span>
                                    <span class="download-info-value" id="download-eta-${index}">--:--</span>
                                </div>
                                <div class="download-info-item">
                                    <span class="download-info-label">已下载:</span>
                                    <span class="download-info-value" id="download-received-${index}">0 B</span>
                                </div>
                            </div>
                            <div class="download-status" id="download-status-${index}" style="display: none;"></div>
                        `;
            } else {
                li.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                                <span>${name}</span>
                                <span style="background-color: #ffc107; color: #856404; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">VIP专属</span>
                            </div>
                        `;
            }
        } else {
            // 非VIP音乐：为VIP用户或超级管理员添加下载按钮
            if (isVIP || isSuperAdminUser) {
                li.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                                <span>${name}</span>
                                <button class="download-btn" onclick="downloadMusic(${index}, event)" 
                                        style="background-color: #28a745; color: white; border: none; padding: 4px 12px; border-radius: 4px; font-size: 12px; cursor: pointer;">
                                    下载
                                </button>
                            </div>
                            <div class="download-progress-container" id="download-progress-${index}" style="display: none;">
                                <div class="download-progress-bar">
                                    <div class="download-progress" id="download-progress-bar-${index}"></div>
                                </div>
                                <div class="download-progress-text" id="download-progress-text-${index}">0%</div>
                            </div>
                            <div class="connection-nodes" id="connection-nodes-${index}" style="display: none;">
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                            </div>
                            <div class="download-info-container" id="download-info-${index}" style="display: none;">
                                <div class="download-info-item">
                                    <span class="download-info-label">速度:</span>
                                    <span class="download-info-value" id="download-speed-${index}">0 KB/s</span>
                                </div>
                                <div class="download-info-item">
                                    <span class="download-info-label">剩余:</span>
                                    <span class="download-info-value" id="download-eta-${index}">--:--</span>
                                </div>
                                <div class="download-info-item">
                                    <span class="download-info-label">已下载:</span>
                                    <span class="download-info-value" id="download-received-${index}">0 B</span>
                                </div>
                            </div>
                            <div class="download-status" id="download-status-${index}" style="display: none;"></div>
                        `;
            } else if (vipStatus === 'DL') {
                // DL标记的歌曲：为普通用户添加下载按钮（极慢速下载）
                li.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                                <span>${name}</span>
                                <button class="download-btn" onclick="downloadMusicForNormalUser(${index}, event)" 
                                        style="background-color: #17a2b8; color: white; border: none; padding: 4px 12px; border-radius: 4px; font-size: 12px; cursor: pointer;">
                                    下载（普通用户）
                                </button>
                            </div>
                            <div class="download-progress-container" id="download-progress-${index}" style="display: none;">
                                <div class="download-progress-bar">
                                    <div class="download-progress" id="download-progress-bar-${index}"></div>
                                </div>
                                <div class="download-progress-text" id="download-progress-text-${index}">0%</div>
                            </div>
                            <div class="connection-nodes" id="connection-nodes-${index}" style="display: none;">
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                                <div class="connection-node"></div>
                            </div>
                            <div class="download-info-container" id="download-info-${index}" style="display: none;">
                                <div class="download-info-item">
                                    <span class="download-info-label">速度:</span>
                                    <span class="download-info-value" id="download-speed-${index}">0 KB/s</span>
                                </div>
                                <div class="download-info-item">
                                    <span class="download-info-label">剩余:</span>
                                    <span class="download-info-value" id="download-eta-${index}">--:--</span>
                                </div>
                                <div class="download-info-item">
                                    <span class="download-info-label">已下载:</span>
                                    <span class="download-info-value" id="download-received-${index}">0 B</span>
                                </div>
                            </div>
                            <div class="download-status" id="download-status-${index}" style="display: none;"></div>
                        `;
            } else {
                li.textContent = name;
            }
        }

        li.addEventListener('click', () => playMusic(index));
        musicListElement.appendChild(li);
    });
}

// 检查用户是否为VIP或超级管理员
function isVIPUser() {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) return false;

    // 检查是否为ZC用户或管理员（视为VIP）
    const [typeCode, userId] = authToken.split('-');
    return typeCode === 'ZC' || userId === '13258227085';
}

// 检查用户是否为超级管理员
function isSuperAdmin() {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) return false;

    const [typeCode, userId] = authToken.split('-');
    return userId === '13258227085';
}
// 添加到下载队列
function addToDownloadQueue(index, name, location) {
    const downloadItem = {
        index: index,
        name: name,
        location: location,
        status: 'waiting',
        progress: 0,
        startTime: null,
        receivedLength: 0,
        totalSize: 0,
        speed: 0,
        eta: '--:--'
    };

    downloadQueue.push(downloadItem);
    updateDownloadQueueDisplay();

    // 如果没有正在进行的下载，开始下载
    if (!currentDownload) {
        processDownloadQueue();
    }
}

// 处理下载队列
async function processDownloadQueue() {
    if (downloadQueue.length === 0) {
        currentDownload = null;
        return;
    }

    // 找到第一个等待中的下载
    const waitingItem = downloadQueue.find(item => item.status === 'waiting');
    if (!waitingItem) {
        currentDownload = null;
        return;
    }

    currentDownload = waitingItem;
    waitingItem.status = 'downloading';
    waitingItem.startTime = Date.now();
    updateDownloadQueueDisplay();

    await startDownload(waitingItem);

    // 完成后处理下一个
    processDownloadQueue();
}

// 开始下载（包含所有专业功能）
async function startDownload(downloadItem) {
    const { index, name, location } = downloadItem;

    // 获取DOM元素
    const button = document.querySelector(`#download-progress-${index}`).previousElementSibling.querySelector('.download-btn');
    const progressContainer = document.getElementById(`download-progress-${index}`);
    const progressBar = document.getElementById(`download-progress-bar-${index}`);
    const progressText = document.getElementById(`download-progress-text-${index}`);
    const statusText = document.getElementById(`download-status-${index}`);
    const connectionNodes = document.getElementById(`connection-nodes-${index}`);
    const downloadInfo = document.getElementById(`download-info-${index}`);
    const downloadSpeed = document.getElementById(`download-speed-${index}`);
    const downloadEta = document.getElementById(`download-eta-${index}`);
    const downloadReceived = document.getElementById(`download-received-${index}`);

    // 显示所有元素
    button.disabled = true;
    button.textContent = '队列中...';
    progressContainer.style.display = 'flex';
    connectionNodes.style.display = 'flex';
    downloadInfo.style.display = 'flex';
    statusText.style.display = 'block';
    statusText.textContent = '准备下载...';

    // 激活连接节点
    const nodes = connectionNodes.querySelectorAll('.connection-node');
    nodes.forEach(node => node.classList.remove('inactive'));

    try {
        // 检查断点续传
        const resumeInfo = downloadHistory.get(location);
        let startByte = 0;
        let receivedLength = resumeInfo ? resumeInfo.receivedLength : 0;

        if (resumeInfo && resumeInfo.receivedLength > 0) {
            statusText.textContent = '检测到未完成下载，继续下载...';
            startByte = resumeInfo.receivedLength;
            receivedLength = resumeInfo.receivedLength;
        }

        // 获取文件信息
        const response = await fetch(location, { method: 'HEAD' });
        if (!response.ok) throw new Error('无法获取文件信息');

        const contentLength = response.headers.get('content-length');
        const totalSize = contentLength ? parseInt(contentLength) : 0;
        downloadItem.totalSize = totalSize;

        statusText.textContent = `文件大小: ${formatFileSize(totalSize)}`;

        // 开始下载（支持断点续传）
        const downloadResponse = await fetch(location, {
            headers: startByte > 0 ? { 'Range': `bytes=${startByte}-` } : {}
        });
        if (!downloadResponse.ok) throw new Error(`下载失败: ${downloadResponse.status}`);

        const reader = downloadResponse.body.getReader();
        const chunks = [];
        let lastUpdateTime = Date.now();
        let lastReceivedLength = receivedLength;

        // 更新连接节点状态
        let nodeIndex = 0;
        const nodeInterval = setInterval(() => {
            nodes[nodeIndex].classList.add('inactive');
            nodeIndex = (nodeIndex + 1) % nodes.length;
            nodes[nodeIndex].classList.remove('inactive');
        }, 500);

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            chunks.push(value);
            receivedLength += value.length;
            downloadItem.receivedLength = receivedLength;

            // 计算下载速度
            const currentTime = Date.now();
            const timeDiff = (currentTime - lastUpdateTime) / 1000; // 秒

            if (timeDiff >= 1) { // 每秒更新一次速度
                const bytesDiff = receivedLength - lastReceivedLength;
                const speed = bytesDiff / timeDiff; // 字节/秒
                downloadItem.speed = speed;

                // 更新速度显示
                downloadSpeed.textContent = `${formatSpeed(speed)}`;
                downloadReceived.textContent = formatFileSize(receivedLength);

                // 计算剩余时间
                if (speed > 0 && totalSize > 0) {
                    const remainingBytes = totalSize - receivedLength;
                    const remainingSeconds = remainingBytes / speed;
                    downloadItem.eta = formatTime(remainingSeconds);
                    downloadEta.textContent = downloadItem.eta;
                }

                lastUpdateTime = currentTime;
                lastReceivedLength = receivedLength;
            }

            // 更新进度
            if (totalSize > 0) {
                const progress = Math.round((receivedLength / totalSize) * 100);
                downloadItem.progress = progress;
                progressBar.style.width = `${progress}%`;
                progressText.textContent = `${progress}%`;

                // 更新状态信息
                statusText.textContent = `下载中... ${formatSpeed(downloadItem.speed)} - 剩余 ${downloadItem.eta}`;
            }

            // 保存断点信息
            downloadHistory.set(location, {
                receivedLength: receivedLength,
                totalSize: totalSize,
                timestamp: Date.now()
            });

            // 随机延迟（保持慢速效果）
            await new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 100));
        }

        clearInterval(nodeInterval);

        // 完成下载
        const blob = new Blob(chunks);
        const url = URL.createObjectURL(blob);

        // 创建下载链接
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // 清理断点记录
        downloadHistory.delete(location);

        // 更新状态
        downloadItem.status = 'completed';
        progressBar.style.width = '100%';
        progressText.textContent = '100%';
        statusText.textContent = '下载完成！';
        statusText.style.color = '#28a745';
        nodes.forEach(node => node.classList.add('inactive'));

        // 3秒后隐藏
        setTimeout(() => {
            progressContainer.style.display = 'none';
            connectionNodes.style.display = 'none';
            downloadInfo.style.display = 'none';
            statusText.style.display = 'none';
            button.disabled = false;
            button.textContent = '下载';
        }, 3000);

    } catch (error) {
        console.error('下载失败:', error);
        downloadItem.status = 'error';

        progressBar.style.background = '#dc3545';
        statusText.textContent = `下载失败: ${error.message}`;
        statusText.style.color = '#dc3545';

        setTimeout(() => {
            progressContainer.style.display = 'none';
            connectionNodes.style.display = 'none';
            downloadInfo.style.display = 'none';
            statusText.style.display = 'none';
            button.disabled = false;
            button.textContent = '下载';
        }, 4000);
    }

    updateDownloadQueueDisplay();
}

// 更新下载队列显示
function updateDownloadQueueDisplay() {
    const queueElement = document.getElementById('download-queue');
    const queueHeader = document.querySelector('.queue-header');
    const queueItems = document.getElementById('queue-items');

    if (downloadQueue.length > 0) {
        queueElement.style.display = 'block';
        const activeCount = downloadQueue.filter(item => item.status === 'downloading').length;
        const totalCount = downloadQueue.length;
        queueHeader.textContent = `下载队列 (${activeCount}/${totalCount})`;

        queueItems.innerHTML = '';
        downloadQueue.forEach((item, i) => {
            const queueItem = document.createElement('div');
            queueItem.className = `queue-item ${item.status === 'downloading' ? 'active' : ''}`;
            queueItem.innerHTML = `
                        <div class="queue-item-name">${item.name}</div>
                        <div class="queue-item-progress">${item.progress}%</div>
                    `;
            queueItems.appendChild(queueItem);
        });
    } else {
        queueElement.style.display = 'none';
    }
}

// 格式化速度
function formatSpeed(bytesPerSecond) {
    if (bytesPerSecond === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 格式化时间（秒转换为 MM:SS）
function formatTime(seconds) {
    if (isNaN(seconds) || seconds === Infinity) return '--:--';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}


/*


歌词部分:
1. 歌词显示区域：
   - 歌词内容居中显示，字体大小为14px，行高为1.8，颜色为#666。
   - 歌词内容区域高度为315px，超出部分自动显示滚动条。
   - 滚动条样式为完全隐藏，不显示浏览器自带滚动条。
2. 歌词滚动功能：
   - 歌词内容超出区域时，显示垂直滚动条。
   - 滚动条样式为完全隐藏，不显示浏览器自带滚动条。
   - 歌词滚动时，同步更新当前播放时间。
3. 歌词滚动同步：
   - 当用户滚动歌词内容区域时，同步更新当前播放时间，保持歌词与音乐同步。
4. 歌词滚动条样式：
   - 歌词滚动条宽度为8px，背景颜色为#e0e0e0。
   - 歌词滚动条滑块颜色为#999，滑块圆角为4px。
   - 歌词滚动条轨道颜色为#f5f5f5。
5. 歌词滚动条交互：
   - 当用户点击滚动条轨道时，直接将滚动条滑块移动到点击位置。
   - 当用户拖动滚动条滑块时，直接将滚动条滑块移动到拖动位置。
6. 歌词滚动条交互优化：
   - 当用户点击滚动条轨道时，直接将滚动条滑块移动到点击位置。
   - 当用户拖动滚动条滑块时，直接将滚动条滑块移动到拖动位置。
   - 滚动条交互时，平滑过渡，避免卡顿。
7. 歌词滚动条交互优化：
   - 当用户点击滚动条轨道时，直接将滚动条滑块移动到点击位置。
   - 当用户拖动滚动条滑块时，直接将滚动条滑块移动到拖动位置。
   - 滚动条交互时，平滑过渡，避免卡顿。
8. 歌词滚动条交互优化：
   - 当用户点击滚动条轨道时，直接将滚动条滑块移动到点击位置。
   - 当用户拖动滚动条滑块时，直接将滚动条滑块移动到拖动位置。
   - 滚动条交互时，平滑过渡，避免卡顿。


*/



// 导出音乐链接功能
const exportMusicSelect = document.getElementById('export-music-select');
const exportLinkBtn = document.getElementById('export-link-btn');
const exportResult = document.getElementById('export-result');
const exportedLink = document.getElementById('exported-link');
const copyLinkBtn = document.getElementById('copy-link-btn');

// 生成安全的音乐链接
function generateMusicLink(musicIndex, isVIPMusic) {
    // 人机验证
    const captcha = generateMathCaptcha();
    const userInput = prompt(captcha.question);

    if (parseInt(userInput) !== captcha.answer) {
        alert('验证失败，请重新获取');
        return;
    }

    const baseUrl = window.location.href.split('?')[0]; // 获取当前页面URL（不含参数）
    const musicData = musicList[musicIndex];
    const parts = musicData.split(' \\ ');
    const name = parts[0];
    const vipStatus = parts[3] || 'UR';

    // 检查是否为超级管理员
    const isSuperAdminUser = isSuperAdmin();
    const timeParam = isSuperAdminUser ? 'YJKW' : Math.floor(Date.now() / 1000).toString();

    // 生成加密参数
    const params = {
        music: musicIndex,
        name: name,
        vip: vipStatus,
        timestamp: timeParam
    };

    // 正确的加密逻辑：先MD5加密，然后Base64编码
    const jsonString = JSON.stringify(params);
    const md5Hash = CryptoJS.MD5(jsonString).toString();

    // 修复：正确的链接格式 - 包含music和time两个参数
    const encodedMusic = btoa(encodeURIComponent(md5Hash));

    return `【${name}】${baseUrl}?music=${encodedMusic}&time=${timeParam}`;
}

// 解析音乐链接参数
function parseMusicLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const musicParam = urlParams.get('music');
    const timeParam = urlParams.get('time');

    if (musicParam && timeParam) {
        try {
            // Base64解码
            const decodedHash = decodeURIComponent(atob(musicParam));

            // 验证链接有效期（超级管理员除外）
            if (timeParam !== 'YJKW') {
                const linkTimestamp = parseInt(timeParam);
                const currentTimestamp = Math.floor(Date.now() / 1000);
                const sevenDaysInSeconds = 7 * 24 * 60 * 60;

                if (currentTimestamp - linkTimestamp > sevenDaysInSeconds) {
                    alert('链接已过期，有效期为7天');
                    return null;
                }
            }

            // 查找匹配的音乐
            for (let i = 0; i < musicList.length; i++) {
                const musicData = musicList[i];
                const parts = musicData.split(' \\ ');
                const name = parts[0];
                const vipStatus = parts[3] || 'UR';

                // 重新生成参数并计算MD5
                const params = {
                    music: i,
                    name: name,
                    vip: vipStatus,
                    timestamp: timeParam
                };
                const jsonString = JSON.stringify(params);
                const expectedHash = CryptoJS.MD5(jsonString).toString();

                if (decodedHash === expectedHash) {
                    return params;
                }
            }

            console.error('链接验证失败：未找到匹配的音乐');
            return null;
        } catch (error) {
            console.error('解析音乐链接参数失败:', error);
            return null;
        }
    }
    return null;
}

// 根据链接自动播放音乐
function playMusicFromLink(linkParams) {
    const musicIndex = linkParams.music;
    const vipStatus = linkParams.vip;
    const isVIPUserFlag = isVIPUser();

    // 检查权限
    if (vipStatus === 'VIP' && !isVIPUserFlag) {
        // 非VIP用户访问VIP音乐，显示提示信息
        alert('这是VIP专属音乐，您需要VIP权限才能完整收听。将为您提供15秒试听。');
        // 自动播放试听版本
        setTimeout(() => {
            playMusic(musicIndex);
        }, 1000);
    } else {
        // VIP用户或免费音乐，直接播放
        playMusic(musicIndex);
    }
}

// 页面加载时检查是否有音乐链接参数
document.addEventListener('DOMContentLoaded', () => {
    // 延迟执行，等待音乐列表加载完成
    setTimeout(() => {
        const linkParams = parseMusicLink();
        if (linkParams) {
            // 检查音乐索引是否有效
            if (linkParams.music >= 0 && linkParams.music < musicList.length) {
                // 添加一个小的延迟，确保音频元素已准备好
                setTimeout(() => {
                    // 创建一个虚拟的用户交互事件来绕过自动播放限制
                    const playButton = document.getElementById('play-btn');
                    if (playButton) {
                        // 模拟用户点击播放按钮来解锁自动播放
                        playButton.click();
                        // 然后播放指定音乐
                        setTimeout(() => {
                            playMusicFromLink(linkParams);
                        }, 100);
                    } else {
                        // 如果没有播放按钮，直接尝试播放
                        playMusicFromLink(linkParams);
                    }
                }, 500);
            } else {
                alert('音乐链接无效或音乐不存在');
            }
        }

        // 填充导出选择框
        populateExportSelect();
    }, 1000);
});

// 填充导出音乐选择框
function populateExportSelect() {
    exportMusicSelect.innerHTML = '<option value="">请选择要导出的音乐</option>';

    musicList.forEach((music, index) => {
        const parts = music.split(' \\ ');
        const name = parts[0];
        const vipStatus = parts[3] || 'UR';

        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${name} ${vipStatus === 'VIP' ? '(VIP专属)' : ''}`;
        exportMusicSelect.appendChild(option);
    });
}

// 生成链接按钮点击事件
exportLinkBtn.addEventListener('click', () => {
    const selectedIndex = parseInt(exportMusicSelect.value);

    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= musicList.length) {
        alert('请选择要导出的音乐');
        return;
    }

    const musicData = musicList[selectedIndex];
    const parts = musicData.split(' \\ ');
    const vipStatus = parts[3] || 'UR';
    const isVIPUserFlag = isVIPUser();

    // 检查权限：非VIP用户不能导出VIP音乐
    if (vipStatus === 'VIP' && !isVIPUserFlag) {
        alert('您没有权限导出VIP专属音乐');
        return;
    }

    // 生成链接
    const musicLink = generateMusicLink(selectedIndex, vipStatus === 'VIP');
    if (musicLink) {
        exportedLink.value = musicLink;
        exportResult.style.display = 'block';
    }
});

// 复制链接按钮点击事件
copyLinkBtn.addEventListener('click', () => {
    exportedLink.select();
    exportedLink.setSelectionRange(0, 99999); // 移动设备支持

    try {
        const successful = document.execCommand('copy');
        if (successful) {
            // 显示复制成功提示
            const originalText = copyLinkBtn.textContent;
            copyLinkBtn.textContent = '已复制';
            copyLinkBtn.style.backgroundColor = '#218838';

            setTimeout(() => {
                copyLinkBtn.textContent = originalText;
                copyLinkBtn.style.backgroundColor = '#28a745';
            }, 2000);
        }
    } catch (err) {
        // 使用现代 Clipboard API
        navigator.clipboard.writeText(exportedLink.value).then(() => {
            const originalText = copyLinkBtn.textContent;
            copyLinkBtn.textContent = '已复制';
            copyLinkBtn.style.backgroundColor = '#218838';

            setTimeout(() => {
                copyLinkBtn.textContent = originalText;
                copyLinkBtn.style.backgroundColor = '#28a745';
            }, 2000);
        }).catch(() => {
            alert('复制失败，请手动复制链接');
        });
    }
});

// 在音乐列表加载完成后重新填充导出选择框
// 修改现有的 loadMusicList 函数，在最后添加
async function loadMusicList() {
    try {
        console.log('开始加载音乐列表数据...');
        const response = await fetch('./music.txt');
        if (!response.ok) {
            throw new Error('音乐列表文件不存在');
        }
        const musicText = await response.text();
        console.log('音乐列表文件内容:', musicText);

        // 按行分割，过滤空行
        musicList = musicText.split('\n')
            .filter(line => line.trim() !== '')
            .map(line => line.trim());

        console.log('解析后的音乐列表:', musicList);

        // 渲染音乐列表
        renderMusicList();
        console.log('音乐列表渲染完成，共加载', musicList.length, '首歌曲');

        // 填充导出选择框
        populateExportSelect();

    } catch (error) {
        console.error('加载音乐列表失败:', error);
        musicListElement.innerHTML = '<li style="color: red; text-align: center;">加载音乐列表失败，请刷新页面重试</li>';
    }
}


/*


分享功能:
1. 点击分享按钮后，会生成当前播放的歌曲的分享链接。
2. 分享链接包含当前播放的歌曲索引、用户ID、时间戳和加密参数。
3. 分享链接可以在微信、QQ等社交媒体平台分享。



*/



// 分享功能实现
document.addEventListener('DOMContentLoaded', function () {
    // 获取分享按钮元素 - 修复为新的ID
    const shareBtn = document.getElementById('share-link-btn');
    const wechatBtn = document.getElementById('share-wechat-btn');
    const qqBtn = document.getElementById('share-qq-btn');

    if (!shareBtn || !wechatBtn || !qqBtn) {
        console.error('分享按钮未找到，请检查HTML结构');
        return;
    }

    // 获取当前播放的歌曲信息
    function getCurrentMusicInfo() {
        const currentSongElement = document.querySelector('.current-song');
        if (!currentSongElement) return null;

        const currentSongName = currentSongElement.textContent;
        if (!currentSongName || currentSongName === '请选择一首歌曲') {
            alert('请先选择一首歌曲进行播放');
            return null;
        }

        // 在音乐列表中查找当前播放的歌曲
        for (let i = 0; i < musicList.length; i++) {
            const musicData = musicList[i];
            const parts = musicData.split(' \\ ');
            const name = parts[0];

            if (name === currentSongName) {
                return {
                    index: i,
                    name: name,
                    vipStatus: parts[3] || 'UR'
                };
            }
        }

        return null;
    }

    // 生成音乐分享链接
    function generateShareLink(musicInfo) {
        if (!musicInfo) return null;

        // 检查是否为超级管理员
        const isSuperAdminUser = isSuperAdmin();
        const timeParam = isSuperAdminUser ? 'YJKW' : Math.floor(Date.now() / 1000).toString();

        // 生成加密参数
        const params = {
            music: musicInfo.index,
            name: musicInfo.name,
            vip: musicInfo.vipStatus,
            timestamp: timeParam
        };

        // 正确的加密逻辑：先MD5加密，然后Base64编码
        const jsonString = JSON.stringify(params);
        const md5Hash = CryptoJS.MD5(jsonString).toString();
        const encodedMusic = btoa(encodeURIComponent(md5Hash));

        const baseUrl = window.location.href.split('?')[0];
        return `【${musicInfo.name}】${baseUrl}?music=${encodedMusic}&time=${timeParam}`;
    }

    // 复制到剪贴板
    function copyToClipboard(text) {
        return new Promise((resolve, reject) => {
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(resolve).catch(reject);
            } else {
                // 回退方案
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                try {
                    const successful = document.execCommand('copy');
                    document.body.removeChild(textArea);
                    if (successful) {
                        resolve();
                    } else {
                        reject(new Error('复制失败'));
                    }
                } catch (err) {
                    document.body.removeChild(textArea);
                    reject(err);
                }
            }
        });
    }

    // 分享链接按钮点击事件
    shareBtn.addEventListener('click', function () {
        const musicInfo = getCurrentMusicInfo();
        if (!musicInfo) return;

        const shareLink = generateShareLink(musicInfo);
        if (!shareLink) {
            alert('生成分享链接失败');
            return;
        }

        copyToClipboard(shareLink).then(() => {
            // 显示成功提示
            const originalText = shareBtn.textContent;
            shareBtn.textContent = '已复制到剪贴板';
            shareBtn.style.backgroundColor = '#28a745';

            setTimeout(() => {
                shareBtn.textContent = originalText;
                shareBtn.style.backgroundColor = '';
            }, 2000);

            console.log('分享链接已复制:', shareLink);
        }).catch(err => {
            console.error('复制失败:', err);
            alert('复制失败，请手动复制链接: ' + shareLink);
        });
    });

    // 分享到微信按钮点击事件
    wechatBtn.addEventListener('click', function () {
        const musicInfo = getCurrentMusicInfo();
        if (!musicInfo) return;

        const shareLink = generateShareLink(musicInfo);
        if (!shareLink) {
            alert('生成分享链接失败');
            return;
        }

        // 检测是否为移动设备
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (isMobile) {
            // 移动端：使用微信JS-SDK分享（需要后端支持）或使用通用分享方式
            copyToClipboard(shareLink).then(() => {
                const originalText = wechatBtn.textContent;
                wechatBtn.textContent = '链接已复制';
                wechatBtn.style.backgroundColor = '#07c160';

                // 尝试使用微信内置浏览器分享
                if (window.WeixinJSBridge) {
                    window.WeixinJSBridge.invoke('shareTimeline', {
                        title: '音乐分享',
                        desc: '分享一首好听的音乐',
                        link: shareLink,
                        imgUrl: window.location.origin + '/assets/ziyit.png'
                    }, function (res) {
                        if (res.err_msg === 'share_timeline:ok') {
                            alert('分享成功！');
                        } else {
                            alert('微信分享失败，链接已复制到剪贴板，请手动分享');
                        }
                    });
                } else {
                    // 非微信内置浏览器，提示用户手动分享
                    alert('链接已复制到剪贴板！\n\n请在微信中：\n1. 打开要分享的聊天窗口\n2. 长按输入框选择粘贴\n3. 发送消息');
                }

                setTimeout(() => {
                    wechatBtn.textContent = originalText;
                    wechatBtn.style.backgroundColor = '';
                }, 2000);

            }).catch(err => {
                alert('复制失败，请手动复制链接: ' + shareLink);
            });
        } else {
            // 电脑端：只复制链接，提示用户手动粘贴
            copyToClipboard(shareLink).then(() => {
                const originalText = wechatBtn.textContent;
                wechatBtn.textContent = '链接已复制';
                wechatBtn.style.backgroundColor = '#07c160';

                // 电脑端提示用户手动操作
                setTimeout(() => {
                    alert('链接已复制到剪贴板！\n\n请在微信中：\n1. 打开要分享的聊天窗口\n2. 按 Ctrl+V 粘贴链接\n3. 发送消息');
                }, 300);

                setTimeout(() => {
                    wechatBtn.textContent = originalText;
                    wechatBtn.style.backgroundColor = '';
                }, 2000);

            }).catch(err => {
                alert('复制失败，请手动复制链接: ' + shareLink);
            });
        }
    });

    // 分享到QQ按钮点击事件
    qqBtn.addEventListener('click', function () {
        const musicInfo = getCurrentMusicInfo();
        if (!musicInfo) return;

        const shareLink = generateShareLink(musicInfo);
        if (!shareLink) return;

        // 检测是否为移动设备
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (isMobile) {
            // 移动端：使用QQ内置分享或通用分享方式
            copyToClipboard(shareLink).then(() => {
                const originalText = qqBtn.textContent;
                qqBtn.textContent = '链接已复制';
                qqBtn.style.backgroundColor = '#12b7f5';

                // 尝试使用QQ内置分享
                if (window.mqq && window.mqq.ui && window.mqq.ui.shareMessage) {
                    window.mqq.ui.shareMessage({
                        title: '音乐分享',
                        desc: '分享一首好听的音乐',
                        share_url: shareLink,
                        image_url: window.location.origin + '/assets/ziyit.png'
                    }, function (result) {
                        if (result.retCode === 0) {
                            alert('分享成功！');
                        } else {
                            alert('QQ分享失败，链接已复制到剪贴板，请手动分享');
                        }
                    });
                } else {
                    // 非QQ内置浏览器，提示用户手动分享
                    alert('链接已复制到剪贴板！\n\n请在QQ中：\n1. 打开要分享的聊天窗口\n2. 长按输入框选择粘贴\n3. 发送消息');
                }

                setTimeout(() => {
                    qqBtn.textContent = originalText;
                    qqBtn.style.backgroundColor = '';
                }, 2000);

            }).catch(err => {
                alert('复制失败，请手动复制链接: ' + shareLink);
            });
        } else {
            // 电脑端：只复制链接，提示用户手动粘贴
            copyToClipboard(shareLink).then(() => {
                const originalText = qqBtn.textContent;
                qqBtn.textContent = '链接已复制';
                qqBtn.style.backgroundColor = '#12b7f5';

                // 电脑端提示用户手动操作
                setTimeout(() => {
                    alert('链接已复制到剪贴板！\n\n请在QQ中：\n1. 打开要分享的聊天窗口\n2. 按 Ctrl+V 粘贴链接\n3. 发送消息');
                }, 300);

                setTimeout(() => {
                    qqBtn.textContent = originalText;
                    qqBtn.style.backgroundColor = '';
                }, 2000);

            }).catch(err => {
                alert('复制失败，请手动复制链接: ' + shareLink);
            });
        }
    });

    // 添加分享按钮样式（使用新的ID选择器）
    const style = document.createElement('style');
    style.textContent = `
        #share-link-btn {
            background - color: #0078d4;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        margin: 5px;
        transition: background-color 0.3s;
                }

        #share-wechat-btn {
            background - color: #07c160;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        margin: 5px;
        transition: background-color 0.3s;
                }

        #share-qq-btn {
            background - color: #12b7f5;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        margin: 5px;
        transition: background-color 0.3s;
                }

        #share-link-btn:hover, #share-wechat-btn:hover, #share-qq-btn:hover {
            opacity: 0.9;
        transform: translateY(-1px);
                }

        #share-link-btn:active, #share-wechat-btn:active, #share-qq-btn:active {
            transform: translateY(0);
                }
        `;
    document.head.appendChild(style);
});