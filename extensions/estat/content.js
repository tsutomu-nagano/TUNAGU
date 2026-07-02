const API_BASE_URL = "http://localhost:8000";

const relationMeta = {
  time: {
    label: "時間軸",
    description: "同じ統計の別時点・別期間",
    icon: "calendar",
  },
  region: {
    label: "地域",
    description: "地域区分や集計範囲が近いデータ",
    icon: "map",
  },
  category: {
    label: "分類",
    description: "分類・属性の切り口が異なるデータ",
    icon: "layers",
  },
  successor: {
    label: "後継",
    description: "更新後・後継系列のデータ",
    icon: "arrowRight",
  },
  predecessor: {
    label: "前身",
    description: "過去系列・前身にあたるデータ",
    icon: "history",
  },
  other: {
    label: "その他",
    description: "関連性のある統計データ",
    icon: "link",
  },
};

const relationOrder = ["time", "region", "category", "successor", "predecessor", "other"];

const icons = {
  arrowRight:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>',
  calendar:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2v4"/><path d="M16 2v4"/><path d="M3 10h18"/><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M8 15h.01"/><path d="M12 15h.01"/><path d="M16 15h.01"/></svg>',
  close:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  download:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>',
  external:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
  layers:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></svg>',
  link:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1"/></svg>',
  list:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>',
  message:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/></svg>',
  map:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18 3 21V6l6-3 6 3 6-3v15l-6 3-6-3Z"/><path d="M9 3v15"/><path d="M15 6v15"/></svg>',
  history:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v6h6"/><path d="M12 7v5l3 2"/></svg>',
  check:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
};

function findStatsDataId() {
  const url = new URL(window.location.href);
  const candidates = [
    url.searchParams.get("statsDataId"),
    url.searchParams.get("statdisp_id"),
    document.body.innerText.match(/\b\d{10}\b/)?.[0],
  ];

  return candidates.find(Boolean) || null;
}

function createButton(statsDataId) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tunagu-related-button";
  button.innerHTML = `${icons.link}<span>関連データ</span>`;
  button.addEventListener("click", () => openDrawer(statsDataId));
  return button;
}

function ensureButton(statsDataId) {
  if (document.querySelector(".tunagu-related-button")) {
    return;
  }

  const heading = document.querySelector("h1, h2, .stat-title, main") || document.body;
  heading.insertAdjacentElement("afterend", createButton(statsDataId));
}

async function openDrawer(statsDataId) {
  const drawer = ensureDrawer();
  drawer.classList.add("is-open");
  drawer.querySelector(".tunagu-drawer-body").innerHTML = '<p class="tunagu-muted">関連データを取得しています。</p>';

  try {
    const response = await fetch(`${API_BASE_URL}/v1/stats/${statsDataId}/relations`);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const payload = await response.json();
    renderRelations(drawer, payload);
  } catch (error) {
    drawer.querySelector(".tunagu-drawer-body").innerHTML =
      '<p class="tunagu-error">関連データを取得できませんでした。API が起動しているか確認してください。</p>';
  }
}

function ensureDrawer() {
  let drawer = document.querySelector(".tunagu-drawer");
  if (drawer) {
    return drawer;
  }

  drawer = document.createElement("aside");
  drawer.className = "tunagu-drawer";
  drawer.innerHTML = `
    <header class="tunagu-drawer-header">
      <div>
        <p>統計データをつなぐ</p>
        <h2>関連統計データ</h2>
      </div>
      <button type="button" class="tunagu-close-button" aria-label="閉じる">${icons.close}</button>
    </header>
    <div class="tunagu-drawer-body"></div>
  `;
  drawer.querySelector(".tunagu-close-button").addEventListener("click", () => {
    drawer.classList.remove("is-open");
  });
  document.body.appendChild(drawer);
  return drawer;
}

function renderRelations(drawer, payload) {
  const body = drawer.querySelector(".tunagu-drawer-body");
  if (!payload.related.length) {
    body.innerHTML = '<p class="tunagu-muted">関連データはまだ登録されていません。</p>';
    return;
  }

  const ids = [payload.stats_data_id, ...payload.related.map((item) => item.stats_data_id)];
  const groups = groupRelations(payload.related);
  body.innerHTML = `
    <section class="tunagu-summary">
      <span class="tunagu-summary-icon">${icons.list}</span>
      <div>
        <p>表示中の統計データ ID</p>
        <strong>${escapeHtml(payload.stats_data_id)}</strong>
      </div>
      <span class="tunagu-summary-count">${payload.related.length}件</span>
    </section>
    ${renderContactAction(payload.stats_data_id)}
    <div class="tunagu-actions">
      <button type="button" class="tunagu-select-all-button" data-tunagu-select-all="true">
        ${icons.check}<span>すべて選択</span>
      </button>
      <a class="tunagu-download-button is-disabled" href="${buildBulkDownloadUrl([])}" target="_blank" rel="noreferrer" aria-disabled="true">
        ${icons.download}<span>選択したものをダウンロード</span><strong>0</strong>
      </a>
    </div>
    <div class="tunagu-relation-tabs">
      <div class="tunagu-tab-list" role="tablist" aria-label="関連データのまとまり">
        ${groups.map((group, index) => renderRelationTab(group, index === 0)).join("")}
      </div>
      <div class="tunagu-tab-panels">
        ${groups.map((group, index) => renderRelationPanel(group, index === 0)).join("")}
      </div>
    </div>
  `;
  wireContactAction(body, payload.stats_data_id);
  wireTabControls(body);
  wireSelectionControls(body);
}

function renderContactAction(statsDataId) {
  return `
    <section class="tunagu-contact">
      <label class="tunagu-contact-field">
        <span>問い合わせ種別</span>
        <select class="tunagu-contact-select" aria-label="問い合わせ種別">
          <option value="location">データの所在に関する問い合わせ</option>
          <option value="content">データの内容に関する問い合わせ</option>
          <option value="other">その他の問い合わせ</option>
        </select>
      </label>
      <a class="tunagu-contact-button" href="${buildContactHref(statsDataId, "location")}" target="_blank" rel="noreferrer">
        ${icons.message}<span>問い合わせる</span>
      </a>
    </section>
  `;
}

function groupRelations(items) {
  const byType = new Map();
  for (const item of items) {
    const type = relationMeta[item.relation_type] ? item.relation_type : "other";
    byType.set(type, [...(byType.get(type) || []), item]);
  }

  return relationOrder
    .filter((type) => byType.has(type))
    .map((type) => ({ type, items: byType.get(type) }));
}

function renderRelationTab(group, isActive) {
  const meta = relationMeta[group.type] || relationMeta.other;
  return `
    <button
      type="button"
      class="tunagu-tab-button"
      id="tunagu-tab-${group.type}"
      role="tab"
      aria-selected="${isActive ? "true" : "false"}"
      aria-controls="tunagu-panel-${group.type}"
      data-tunagu-tab="${group.type}"
    >
      <span class="tunagu-tab-icon">${icons[meta.icon] || icons.link}</span>
      <span>${meta.label}</span>
      <strong>${group.items.length}</strong>
    </button>
  `;
}

function renderRelationPanel(group, isActive) {
  const meta = relationMeta[group.type] || relationMeta.other;
  return `
    <section
      class="tunagu-tab-panel tunagu-relation-group-${group.type}"
      id="tunagu-panel-${group.type}"
      role="tabpanel"
      aria-labelledby="tunagu-tab-${group.type}"
      ${isActive ? "" : "hidden"}
    >
      <div class="tunagu-panel-header">
        <div>
          <h3>${meta.label}</h3>
          <p>${meta.description}</p>
        </div>
        <a class="tunagu-group-download" href="${buildBulkDownloadUrl(group.items.map((item) => item.stats_data_id))}" target="_blank" rel="noreferrer">
          ${icons.download}<span>このまとまり</span>
        </a>
      </div>
      <div class="tunagu-table-wrap">
        <table class="tunagu-relation-table">
          <thead>
            <tr>
              <th scope="col" class="tunagu-check-column">選択</th>
              <th scope="col">統計データ</th>
              <th scope="col">ID</th>
              <th scope="col">形式</th>
              <th scope="col">更新</th>
              <th scope="col" class="tunagu-action-column">操作</th>
            </tr>
          </thead>
          <tbody>
            ${group.items.map((item) => renderRelationRow(item)).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderRelationRow(item) {
  return `
    <tr class="tunagu-relation-row">
      <td>
        <label class="tunagu-select-control">
          <input type="checkbox" class="tunagu-relation-checkbox" value="${escapeHtml(item.stats_data_id)}" checked />
          <span>${icons.check}</span>
        </label>
      </td>
      <td class="tunagu-title-cell">${escapeHtml(item.title)}</td>
      <td class="tunagu-id-cell">${escapeHtml(item.stats_data_id)}</td>
      <td>${renderFormatBadges(item.formats)}</td>
      <td>${item.updated_at ? escapeHtml(item.updated_at) : "-"}</td>
      <td>
        <a class="tunagu-open-link" href="https://www.e-stat.go.jp/stat-search/files?page=1&statsDataId=${encodeURIComponent(item.stats_data_id)}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(item.title)}を開く">
          ${icons.external}<span>開く</span>
        </a>
      </td>
    </tr>
  `;
}

function renderFormatBadges(formats) {
  const normalizedFormats = Array.isArray(formats) && formats.length ? formats : ["未確認"];
  return `
    <div class="tunagu-format-list" aria-label="提供形式">
      ${normalizedFormats
        .map((format) => `<span class="tunagu-format-badge">${escapeHtml(format)}</span>`)
        .join("")}
    </div>
  `;
}

function wireSelectionControls(root) {
  const checkboxes = Array.from(root.querySelectorAll(".tunagu-relation-checkbox"));
  const download = root.querySelector(".tunagu-download-button");
  const selectAll = root.querySelector(".tunagu-select-all-button");

  const update = () => {
    const selectedIds = checkboxes.filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value);
    download.href = buildBulkDownloadUrl(selectedIds);
    download.querySelector("strong").textContent = String(selectedIds.length);
    download.classList.toggle("is-disabled", selectedIds.length === 0);
    download.setAttribute("aria-disabled", selectedIds.length === 0 ? "true" : "false");
    selectAll.querySelector("span").textContent =
      selectedIds.length === checkboxes.length ? "すべて解除" : "すべて選択";
  };

  for (const checkbox of checkboxes) {
    checkbox.addEventListener("change", update);
  }

  selectAll.addEventListener("click", () => {
    const shouldSelect = checkboxes.some((checkbox) => !checkbox.checked);
    for (const checkbox of checkboxes) {
      checkbox.checked = shouldSelect;
    }
    update();
  });

  download.addEventListener("click", (event) => {
    if (download.getAttribute("aria-disabled") === "true") {
      event.preventDefault();
    }
  });

  update();
}

function wireTabControls(root) {
  const tabs = Array.from(root.querySelectorAll(".tunagu-tab-button"));
  const panels = Array.from(root.querySelectorAll(".tunagu-tab-panel"));

  const activate = (selectedTab) => {
    for (const tab of tabs) {
      const isSelected = tab === selectedTab;
      tab.setAttribute("aria-selected", isSelected ? "true" : "false");
    }

    for (const panel of panels) {
      panel.hidden = panel.id !== selectedTab.getAttribute("aria-controls");
    }
  };

  for (const tab of tabs) {
    tab.addEventListener("click", () => activate(tab));
  }
}

function wireContactAction(root, statsDataId) {
  const select = root.querySelector(".tunagu-contact-select");
  const button = root.querySelector(".tunagu-contact-button");
  if (!select || !button) {
    return;
  }

  select.addEventListener("change", () => {
    button.href = buildContactHref(statsDataId, select.value);
  });
}

function buildContactHref(statsDataId, inquiryType) {
  const labels = {
    location: "データの所在に関する問い合わせ",
    content: "データの内容に関する問い合わせ",
    other: "その他の問い合わせ",
  };
  const inquiryLabel = labels[inquiryType] || labels.other;
  const subject = `【TUNAGU】${inquiryLabel}`;
  const body = [
    `${inquiryLabel}`,
    "",
    `統計データ ID: ${statsDataId}`,
    `参照ページ: ${window.location.href}`,
    "",
    "問い合わせ内容:",
  ].join("\n");

  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function buildBulkDownloadUrl(ids) {
  const params = new URLSearchParams();
  params.set("statsDataIds", ids.join(","));
  return `${API_BASE_URL}/v1/downloads/bulk?${params.toString()}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const statsDataId = findStatsDataId();
if (statsDataId) {
  ensureButton(statsDataId);
}
