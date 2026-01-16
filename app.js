const pages = Array.from(document.querySelectorAll(".page"));
const dotsContainer = document.querySelector("#pageDots");
const pageCount = document.querySelector("#pageCount");

const palette = ["#f25f4c", "#f9a826", "#1b1b1b", "#4d8b31", "#2f6fd8", "#b0539c", "#f28c9a"];

const datasets = {
  time: {
    title: "A기업의 지난 30일간 주가 변화 ($)",
    labels: Array.from({length: 30}, (_, i) => (i + 1).toString()),
    values: [50, 52, 56, 57, 63, 60, 63, 66, 69, 64, 60, 55, 54, 55, 58, 53, 53, 48, 52, 49, 44, 42, 48, 51, 49, 44, 43, 39, 40, 40],
    hints: {
      line: "데이터가 많아도 흐름을 한눈에 파악할 수 있어요.",
      bar: "막대 간의 높이 차이를 하나씩 비교하기 번거로워요."
    }
  },
  ratio: {
    title: "스마트폰 제조사별 시장 점유율 (%)",
    labels: ["S사", "A사", "X사", "M사", "기타"],
    values: [30, 22, 25, 15, 8],
    hints: {
      pie: "전체 시장에서 각 제조사가 차지하는 비중을 쉽게 비교할 수 있어요.",
      bar: "각 제조사의 점유율 크기를 비교할 때도 사용할 수 있어요."
    }
  },
  distribution: {
    title: "중학교 1학년 학생들의 발 사이즈 분포 (100명)",
    rawValues: [235, 242, 258, 227, 245, 263, 238, 251, 269, 233, 248, 256, 224, 241, 267, 237, 254, 272, 229, 246, 261, 234, 249, 265, 226, 243, 259, 231, 252, 268, 236, 247, 264, 228, 244, 271, 239, 253, 266, 232, 248, 257, 225, 242, 262, 238, 255, 273, 230, 247, 260, 235, 250, 267, 227, 244, 258, 233, 251, 269, 236, 248, 263, 229, 245, 270, 238, 254, 265, 231, 249, 257, 226, 243, 261, 237, 252, 268, 228, 246, 259, 234, 250, 266, 230, 247, 262, 239, 255, 271, 232, 248, 264, 225, 244, 260, 236, 253, 267, 241],
    hints: {
      histogram: "발사이즈가 어느 범위에 많이 분포하는지 알 수 있어요.",
      bar: "모든 발사이즈 값을 개별 막대로 다 그리니 분포를 보기가 너무 어려워요." 
    }
  }
};

const miniExamples = {
  line: {
    labels: ["1", "2", "3", "4", "5"],
    values: [10, 20, 16, 28, 24]
  },
  bar: {
    labels: ["A", "B", "C", "D"],
    values: [12, 19, 7, 15]
  },
  histogram: {
    rawValues: [55, 60, 62, 58, 73, 77, 80, 68, 71, 69, 85, 90]
  },
  pie: {
    labels: ["빨강", "노랑", "파랑"],
    values: [45, 30, 25]
  }
};

let currentPage = 0;

function setupDots() {
  dotsContainer.innerHTML = "";
  pages.forEach((page, index) => {
    const dot = document.createElement("div");
    dot.className = "dot";
    dot.addEventListener("click", () => showPage(index));
    dotsContainer.appendChild(dot);
  });
}

function showPage(index) {
  if (index < 0) index = pages.length - 1;
  if (index >= pages.length) index = 0;
  currentPage = index;
  pages.forEach((page, idx) => page.classList.toggle("active", idx === index));
  document.querySelectorAll(".dot").forEach((dot, idx) => dot.classList.toggle("active", idx === index));
  pageCount.textContent = `${index + 1} / ${pages.length} · ${pages[index].dataset.title}`;
  renderVisibleCharts();
}

function attachNavigation() {
  document.querySelectorAll("[data-next]").forEach((button) => {
    button.addEventListener("click", () => showPage(currentPage + 1));
  });
  document.querySelectorAll("[data-prev]").forEach((button) => {
    button.addEventListener("click", () => showPage(currentPage - 1));
  });
}

function setupCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return ctx;
}

function drawGrid(ctx, width, height, padding) {
  ctx.strokeStyle = "#efe5d5";
  ctx.lineWidth = 1;
  const lines = 4;
  for (let i = 0; i <= lines; i += 1) {
    const y = padding.top + ((height - padding.top - padding.bottom) / lines) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }
}

function drawAxes(ctx, width, height, padding) {
  ctx.strokeStyle = "#1b1b1b";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, height - padding.bottom);
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.stroke();
}

function drawFormattedLabels(ctx, width, height, padding, labels, type = "line", numBins = null) {
  ctx.fillStyle = "#5d5a52";
  ctx.font = '12px "Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  ctx.textAlign = "center";
  
  // Decide skip rate for labels if too many
  const skipRate = labels.length > 20 ? Math.ceil(labels.length / 10) : 1;

  if (type === "line") {
    const step = labels.length > 1
      ? (width - padding.left - padding.right) / (labels.length - 1)
      : 0;
    labels.forEach((label, index) => {
      if (index % skipRate === 0) {
        const x = padding.left + step * index;
        ctx.fillText(label, x, height - padding.bottom + 18);
      }
    });
  } else if (type === "histogram") {
    // 히스토그램은 더 작은 글씨
    ctx.font = '10px "Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
    const availableWidth = width - padding.left - padding.right;
    const count = numBins || labels.length;
    const step = availableWidth / count;

    labels.forEach((label, index) => {
      const centerX = padding.left + index * step + step / 2;
      ctx.fillText(label, centerX, height - padding.bottom + 16);
    });
  } else if (type === "bar") {
    const availableWidth = width - padding.left - padding.right;
    const step = availableWidth / labels.length;
    
    // 막대마다 눈금 그리기, 5마다 더 크고 굵은 눈금 + 숫자 표시
    labels.forEach((label, index) => {
      const centerX = padding.left + index * step + step / 2;
      const tickY = height - padding.bottom;
      const numLabel = parseInt(label);
      
      if (numLabel % 5 === 0) {
        // 5의 배수: 굵고 긴 눈금 + 숫자
        ctx.strokeStyle = "#1b1b1b";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, tickY);
        ctx.lineTo(centerX, tickY + 10);
        ctx.stroke();
        ctx.fillText(label, centerX, tickY + 22);
      } else {
        // 일반: 작은 눈금만
        ctx.strokeStyle = "#5d5a52";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(centerX, tickY);
        ctx.lineTo(centerX, tickY + 4);
        ctx.stroke();
      }
    });
  }
}

function drawLabels(ctx, width, height, padding, labels) {
  drawFormattedLabels(ctx, width, height, padding, labels, "line");
}

function drawValueScale(ctx, width, height, padding, min, max, unit) {
  ctx.fillStyle = "#5d5a52";
  ctx.textAlign = "right";
  ctx.font = '12px "Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  const steps = 4;
  for (let i = 0; i <= steps; i += 1) {
    const value = Math.round(min + (max - min) * (1 - i / steps));
    const label = unit ? `${value}${unit}` : `${value}`;
    const y = padding.top + ((height - padding.top - padding.bottom) / steps) * i + 4;
    ctx.fillText(label, padding.left - 8, y);
  }
  ctx.textAlign = "left"; // Reset defaults
}

function drawLineChart(ctx, width, height, labels, values) {
  const padding = { top: 30, right: 20, bottom: 40, left: 50 };
  const max = Math.max(...values);
  const min = Math.min(...values);

  drawGrid(ctx, width, height, padding);
  drawAxes(ctx, width, height, padding);
  drawLabels(ctx, width, height, padding, labels);

  ctx.strokeStyle = palette[0];
  ctx.lineWidth = 3;
  ctx.beginPath();
  values.forEach((value, index) => {
    const x = padding.left + (index / (values.length - 1)) * (width - padding.left - padding.right);
    const y = padding.top + (1 - (value - min) / (max - min)) * (height - padding.top - padding.bottom);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = palette[0];
  values.forEach((value, index) => {
    const x = padding.left + (index / (values.length - 1)) * (width - padding.left - padding.right);
    const y = padding.top + (1 - (value - min) / (max - min)) * (height - padding.top - padding.bottom);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  drawValueScale(ctx, width, height, padding, min, max, "");
}

function drawBarChart(ctx, width, height, labels, values) {
  const padding = { top: 30, right: 20, bottom: 40, left: 50 };
  const max = Math.max(...values);

  drawGrid(ctx, width, height, padding);
  drawAxes(ctx, width, height, padding);

  const availableWidth = width - padding.left - padding.right;
  const step = availableWidth / labels.length;
  
  // Use 80% of the step for the bar, leaving 20% as gap
  // This ensures bars are always reasonably thick regardless of count
  const barWidth = step * 0.8;
  const gapHalf = (step - barWidth) / 2;

  values.forEach((value, index) => {
    // Center the bar in its slot
    const x = padding.left + index * step + gapHalf;
    
    const heightRatio = value / max;
    const barHeight = heightRatio * (height - padding.top - padding.bottom);
    ctx.fillStyle = "#2f6fd8";
    ctx.fillRect(x, height - padding.bottom - barHeight, barWidth, barHeight);
  });

  drawFormattedLabels(ctx, width, height, padding, labels, "bar");
  drawValueScale(ctx, width, height, padding, 0, max, "");
}

function buildHistogram(rawValues, binSize) {
  const min = Math.floor(Math.min(...rawValues) / binSize) * binSize;
  const max = Math.ceil((Math.max(...rawValues) + 1) / binSize) * binSize;
  const bins = Math.ceil((max - min) / binSize);
  const counts = Array.from({ length: bins }, () => 0);
  rawValues.forEach((value) => {
    const index = Math.min(Math.floor((value - min) / binSize), bins - 1);
    counts[index] += 1;
  });
  // 경계값 레이블 생성 (bins + 1개)
  const boundaryLabels = [];
  for (let i = 0; i <= bins; i++) {
    boundaryLabels.push(min + i * binSize);
  }
  return { counts, boundaryLabels, min, binSize };
}

function drawHistogram(ctx, width, height, rawValues) {
  const padding = { top: 30, right: 20, bottom: 40, left: 50 };
  const binSize = 10;
  const { counts, boundaryLabels, min } = buildHistogram(rawValues, binSize);
  const maxCount = Math.max(...counts);
  const numBins = counts.length;

  drawGrid(ctx, width, height, padding);
  drawAxes(ctx, width, height, padding);

  const availableWidth = width - padding.left - padding.right;
  const barWidth = availableWidth / numBins; // 간격 없이 꽉 채움

  counts.forEach((count, index) => {
    const x = padding.left + index * barWidth;
    const barHeight = (count / maxCount) * (height - padding.top - padding.bottom);
    ctx.fillStyle = "#4d8b31";
    ctx.fillRect(x, height - padding.bottom - barHeight, barWidth, barHeight);
  });

  // 경계값 레이블 그리기
  ctx.fillStyle = "#5d5a52";
  ctx.font = '10px "Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  ctx.textAlign = "center";
  boundaryLabels.forEach((value, index) => {
    const x = padding.left + (index / numBins) * availableWidth;
    ctx.fillText(value.toString(), x, height - padding.bottom + 16);
  });

  drawValueScale(ctx, width, height, padding, 0, maxCount, "명");

  return { counts, boundaryLabels };
}

function drawPieChart(ctx, width, height, labels, values) {
  const total = values.reduce((sum, value) => sum + value, 0);
  const radius = Math.min(width, height) * 0.32;
  const centerX = width / 2;
  const centerY = height / 2;

  let startAngle = -Math.PI / 2;
  values.forEach((value, index) => {
    const sliceAngle = (value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = palette[index % palette.length];
    ctx.fill();

    // Draw percentage
    const midAngle = startAngle + sliceAngle / 2;
    const percentage = Math.round((value / total) * 100) + "%";
    const textRadius = radius * 1.35; // Position outside the pie
    // If slice is large enough, put inside? Or always outside?
    // User requested "inside the chart" (파이차트는 차트 안에 퍼센트를 입력)
    const innerRadius = radius * 0.6;
    const tx = centerX + Math.cos(midAngle) * innerRadius;
    const ty = centerY + Math.sin(midAngle) * innerRadius;
    
    ctx.fillStyle = "#fff";
    ctx.font = '600 12px "Noto Sans KR", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Shadow for better visibility
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 4;
    ctx.fillText(percentage, tx, ty);
    ctx.shadowBlur = 0; // Reset shadow

    startAngle += sliceAngle;
  });

  // Draw legend
  const legendX = width - 60;
  const legendY = 20;
  const legendItemHeight = 22;
  
  ctx.font = '500 12px "Noto Sans KR", sans-serif';
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  
  labels.forEach((label, index) => {
    const y = legendY + index * legendItemHeight;
    // Color box
    ctx.fillStyle = palette[index % palette.length];
    ctx.fillRect(legendX, y, 14, 14);
    // Label text
    ctx.fillStyle = "#1b1b1b";
    ctx.fillText(label, legendX + 20, y + 7);
  });
}

function renderChart(area, type) {
  const chartId = area.dataset.chartId;
  const data = datasets[chartId];
  const canvas = area.querySelector("canvas");
  const ctx = setupCanvas(canvas);
  const width = canvas.getBoundingClientRect().width;
  const height = canvas.getBoundingClientRect().height;
  ctx.clearRect(0, 0, width, height);

  if (type === "line") drawLineChart(ctx, width, height, data.labels, data.values);
  if (type === "bar" && data.rawValues) {
    // Show exact frequencies for every single value (no binning)
    const countsMap = {};
    data.rawValues.forEach(v => { countsMap[v] = (countsMap[v] || 0) + 1; });
    const min = Math.min(...data.rawValues);
    const max = Math.max(...data.rawValues);
    const labels = [];
    const counts = [];
    for (let i = min; i <= max; i++) {
        labels.push(i.toString());
        counts.push(countsMap[i] || 0);
    }
    drawBarChart(ctx, width, height, labels, counts);
  } else if (type === "bar") {
    drawBarChart(ctx, width, height, data.labels, data.values);
  }
  if (type === "histogram") drawHistogram(ctx, width, height, data.rawValues);
  if (type === "pie") drawPieChart(ctx, width, height, data.labels, data.values);

  const hint = area.querySelector("[data-hint]");
  if (hint) hint.textContent = ""; // 힌트 숨김 - 선택 시에만 표시
}

function setupChartAreas() {
  document.querySelectorAll(".chart-area").forEach((area) => {
    const defaultType = area.dataset.default;
    renderChart(area, defaultType);
    area.querySelectorAll("button[data-chart]").forEach((button) => {
      button.addEventListener("click", () => {
        area.querySelectorAll("button[data-chart]")
          .forEach((btn) => btn.classList.toggle("active", btn === button));
        renderChart(area, button.dataset.chart);
      });
    });
  });
}

function drawMiniCharts() {
  document.querySelectorAll(".mini-chart").forEach((canvas) => {
    const type = canvas.dataset.mini;
    const ctx = setupCanvas(canvas);
    const width = canvas.getBoundingClientRect().width;
    const height = canvas.getBoundingClientRect().height;
    ctx.clearRect(0, 0, width, height);
    if (type === "line") {
      drawLineChart(ctx, width, height, miniExamples.line.labels, miniExamples.line.values);
    }
    if (type === "bar") {
      drawBarChart(ctx, width, height, miniExamples.bar.labels, miniExamples.bar.values);
    }
    if (type === "histogram") {
      drawHistogram(ctx, width, height, miniExamples.histogram.rawValues);
    }
    if (type === "pie") {
      drawPieChart(ctx, width, height, miniExamples.pie.labels, miniExamples.pie.values);
    }
  });
}

const feedbackMessages = {
  time: {
    correct: "line",
    line: { text: "정답이에요! 꺾은선 그래프는 시간에 따른 변화를 한눈에 파악하기 좋아요.", hint: "데이터가 많아도 흐름을 한눈에 파악할 수 있어요." },
    bar: { text: "아쉬워요. 막대 그래프는 30개나 되는 데이터의 흐름을 파악하기 어려워요.", hint: "막대 간의 높이 차이를 하나씩 비교하기 번거로워요." }
  },
  ratio: {
    correct: "pie",
    pie: { text: "정답이에요! 파이 차트는 전체에서 각 부분이 차지하는 비율을 직관적으로 보여줘요.", hint: "전체 시장에서 각 제조사가 차지하는 비중을 쉽게 비교할 수 있어요." },
    bar: { text: "아쉬워요. 막대 그래프도 비교는 가능하지만, 전체 대비 비율을 보여주기엔 파이 차트가 더 적합해요.", hint: "각 제조사의 점유율 크기를 비교할 때도 사용할 수 있어요." }
  },
  distribution: {
    correct: "histogram",
    histogram: { text: "정답이에요! 히스토그램은 데이터가 어느 구간에 몰려있는지 분포를 파악하기 좋아요.", hint: "발사이즈가 어느 범위에 많이 분포하는지 알 수 있어요." },
    bar: { text: "아쉬워요. 막대 그래프로 모든 값을 개별로 표시하면 분포를 파악하기 어려워요.", hint: "모든 발사이즈 값을 개별 막대로 다 그리니 분포를 보기가 너무 어려워요." }
  }
};

function setupReflections() {
  document.querySelectorAll(".reflection").forEach((section) => {
    const inputs = section.querySelectorAll("input[type='radio']");
    const feedbackDiv = section.querySelector(".feedback");
    const correctAnswer = section.dataset.correct;
    
    // 차트 ID 찾기
    const panel = section.closest(".panel");
    const chartArea = panel.querySelector(".chart-area");
    const chartId = chartArea ? chartArea.dataset.chartId : null;

    inputs.forEach((input) => {
      input.addEventListener("change", () => {
        const selected = input.value;
        const isCorrect = selected === correctAnswer;
        const feedback = feedbackMessages[chartId];
        
        if (feedback) {
          const message = feedback[selected];
          if (isCorrect) {
            feedbackDiv.innerHTML = `<div class="feedback-correct"><strong>✓ ${message.text}</strong><br><span class="hint-text">${message.hint}</span></div>`;
          } else {
            feedbackDiv.innerHTML = `<div class="feedback-wrong"><strong>✗ ${message.text}</strong><br><span class="hint-text">${message.hint}</span></div>`;
          }
        }
      });
    });
  });
}

function renderVisibleCharts() {
  const visiblePage = pages[currentPage];
  visiblePage.querySelectorAll(".chart-area").forEach((area) => {
    const activeButton = area.querySelector("button.active");
    if (activeButton) renderChart(area, activeButton.dataset.chart);
  });
  visiblePage.querySelectorAll(".mini-chart").forEach((canvas) => {
    const type = canvas.dataset.mini;
    const ctx = setupCanvas(canvas);
    const width = canvas.getBoundingClientRect().width;
    const height = canvas.getBoundingClientRect().height;
    ctx.clearRect(0, 0, width, height);
    if (type === "line") drawLineChart(ctx, width, height, miniExamples.line.labels, miniExamples.line.values);
    if (type === "bar") drawBarChart(ctx, width, height, miniExamples.bar.labels, miniExamples.bar.values);
    if (type === "histogram") drawHistogram(ctx, width, height, miniExamples.histogram.rawValues);
    if (type === "pie") drawPieChart(ctx, width, height, miniExamples.pie.labels, miniExamples.pie.values);
  });
}

setupDots();
attachNavigation();
setupChartAreas();
setupReflections();
drawMiniCharts();
showPage(0);

window.addEventListener("resize", () => {
  drawMiniCharts();
  renderVisibleCharts();
});


