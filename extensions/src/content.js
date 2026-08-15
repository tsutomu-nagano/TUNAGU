const API_BASE_URL = "https://tunagu.onrender.com";

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

const relationOrder = [
  "time",
  "region",
  "category",
  "successor",
  "predecessor",
  "other",
];

const relationAvailabilityCache = new Map();
const pendingRelationChecks = new Set();
const relationCheckCallbacks = new Map();
let relationCheckTimer = null;

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
    findStatsDataIdFromDownloadLinks(),
    document.body.innerText.match(/\b\d{10,12}\b/)?.[0],
  ];

  return candidates.find(Boolean) || null;
}

function findStatsDataIdFromDownloadLinks() {
  const links = Array.from(
    document.querySelectorAll('a[href*="file-download"]')
  );

  for (const link of links) {
    const statsDataId = findStatsDataIdFromLink(link);

    if (statsDataId) {
      return statsDataId;
    }
  }

  return null;
}

function findStatsDataIdFromLink(link) {
  try {
    const href = new URL(
      link.getAttribute("href"),
      window.location.href
    );

    return (
      href.searchParams.get("statInfId") ||
      href.searchParams.get("statinfid")
    );
  } catch (_error) {
    return null;
  }
}

function findStatsDataIdInDatasetItem(item) {
  const dataLink = item.querySelector(
    "a.js-data[data-value]"
  );

  if (dataLink?.dataset.value) {
    return dataLink.dataset.value;
  }

  const downloadLinks = Array.from(
    item.querySelectorAll('a[href*="file-download"]')
  );

  for (const link of downloadLinks) {
    const statsDataId = findStatsDataIdFromLink(link);

    if (statsDataId) {
      return statsDataId;
    }
  }

  return null;
}

function createButton(statsDataId) {
  const button = document.createElement("button");

  button.type = "button";
  button.className = "tunagu-related-button";
  button.innerHTML =
    `${icons.link}<span>関連データ</span>`;

  button.addEventListener("click", () =>
    openDrawer(statsDataId)
  );

  return button;
}

function ensureButton(statsDataId) {
  const insertedToTable =
    ensureResultTableButtons();

  const insertedToDatasetList =
    ensureDatasetListButtons();

  if (
    insertedToTable ||
    insertedToDatasetList
  ) {
    return;
  }

  if (
    document.querySelector(
      ".tunagu-related-button, .tunagu-related-button-slot"
    )
  ) {
    return;
  }

  const heading =
    document.querySelector(
      "h1, h2, .stat-title, main"
    ) || document.body;

  heading.insertAdjacentElement(
    "afterend",
    createDeferredButtonContainer(
      statsDataId
    )
  );
}

function createDeferredButtonContainer(
  statsDataId
) {
  const container =
    document.createElement("span");

  container.className =
    "tunagu-related-button-slot";

  showButtonWhenRelationsExist(
    statsDataId,
    container
  );

  return container;
}

function showButtonWhenRelationsExist(
  statsDataId,
  container
) {
  checkRelationsExist(
    statsDataId,
    (hasRelations) => {
      if (
        !hasRelations ||
        !container.isConnected ||
        container.querySelector(
          ".tunagu-related-button"
        )
      ) {
        return;
      }

      container.append(
        createButton(statsDataId)
      );
    }
  );
}

function ensureDatasetListButtons() {
  let inserted = false;

  const items = Array.from(
    document.querySelectorAll(
      "li.stat-dataset_list-detail-item"
    )
  );

  for (const item of items) {
    if (
      item.querySelector(
        ".tunagu-related-button, .tunagu-related-button-slot"
      )
    ) {
      inserted = true;
      continue;
    }

    const iconElements = Array.from(
      item.querySelectorAll(".stat-dl_icon")
    );

    if (iconElements.length === 0) {
      continue;
    }

    const lastIcon =
      iconElements[
        iconElements.length - 1
      ];

    const statsDataId =
      findStatsDataIdInDatasetItem(item);

    if (!statsDataId) {
      continue;
    }

    lastIcon.insertAdjacentElement(
      "afterend",
      createDeferredButtonContainer(
        statsDataId
      )
    );

    inserted = true;
  }

  return inserted;
}

function ensureResultTableButtons() {
  let inserted = false;

  const tables = Array.from(
    document.querySelectorAll("table")
  );

  for (const table of tables) {
    const displayColumnIndex =
      findDisplayDownloadColumnIndex(
        table
      );

    if (displayColumnIndex === -1) {
      continue;
    }

    ensureResultTableHeader(
      table,
      displayColumnIndex
    );

    const rows = Array.from(
      table.querySelectorAll("tbody tr")
    );

    for (const row of rows) {
      if (
        row.querySelector(
          ".tunagu-related-cell"
        )
      ) {
        inserted = true;
        continue;
      }

      const cells = Array.from(
        row.children
      ).filter((cell) =>
        cell.matches("td, th")
      );

      const displayCell =
        cells[displayColumnIndex];

      if (!displayCell) {
        continue;
      }

      const statsDataId =
        findStatsDataIdInRow(row);

      if (!statsDataId) {
        continue;
      }

      const relatedCell =
        document.createElement("td");

      relatedCell.className =
        "tunagu-related-cell";

      relatedCell.append(
        createDeferredButtonContainer(
          statsDataId
        )
      );

      displayCell.insertAdjacentElement(
        "afterend",
        relatedCell
      );

      inserted = true;
    }
  }

  return inserted;
}

function findDisplayDownloadColumnIndex(
  table
) {
  const headerRows = Array.from(
    table.querySelectorAll(
      "thead tr, tr"
    )
  ).filter((row) =>
    Array.from(row.children).some(
      (cell) =>
        cell.matches("th")
    )
  );

  for (const row of headerRows) {
    const cells = Array.from(
      row.children
    ).filter((cell) =>
      cell.matches("th, td")
    );

    const index =
      cells.findIndex((cell) => {
        const text = normalizeText(
          cell.textContent
        );

        return (
          text.includes("表示") &&
          text.includes(
            "ダウンロード"
          )
        );
      });

    if (index !== -1) {
      return index;
    }
  }

  return -1;
}

function ensureResultTableHeader(
  table,
  displayColumnIndex
) {
  const headerRows = Array.from(
    table.querySelectorAll(
      "thead tr, tr"
    )
  ).filter((row) =>
    Array.from(row.children).some(
      (cell) =>
        cell.matches("th")
    )
  );

  const headerRow =
    headerRows.find((row) => {
      const cells = Array.from(
        row.children
      ).filter((cell) =>
        cell.matches("th, td")
      );

      return (
        cells[displayColumnIndex] &&
        normalizeText(
          cells[
            displayColumnIndex
          ].textContent
        ).includes("ダウンロード")
      );
    });

  if (
    !headerRow ||
    headerRow.querySelector(
      ".tunagu-related-header"
    )
  ) {
    return;
  }

  const cells = Array.from(
    headerRow.children
  ).filter((cell) =>
    cell.matches("th, td")
  );

  const displayHeader =
    cells[displayColumnIndex];

  if (!displayHeader) {
    return;
  }

  const relatedHeader =
    document.createElement("th");

  relatedHeader.className =
    "tunagu-related-header";

  relatedHeader.scope = "col";

  relatedHeader.textContent =
    "関連データ";

  displayHeader.insertAdjacentElement(
    "afterend",
    relatedHeader
  );
}

function findStatsDataIdInRow(row) {
  const downloadLinks = Array.from(
    row.querySelectorAll(
      'a[href*="file-download"]'
    )
  );

  for (const link of downloadLinks) {
    const statsDataId =
      findStatsDataIdFromLink(link);

    if (statsDataId) {
      return statsDataId;
    }
  }

  return (
    row.textContent.match(
      /\b\d{10,12}\b/
    )?.[0] || null
  );
}

function normalizeText(value) {
  return String(value || "").replace(
    /\s+/g,
    ""
  );
}

function checkRelationsExist(
  statsDataId,
  callback
) {
  if (!statsDataId) {
    callback(false);
    return;
  }

  if (
    relationAvailabilityCache.has(
      statsDataId
    )
  ) {
    callback(
      relationAvailabilityCache.get(
        statsDataId
      )
    );
    return;
  }

  const callbacks =
    relationCheckCallbacks.get(
      statsDataId
    ) || [];

  callbacks.push(callback);
  relationCheckCallbacks.set(
    statsDataId,
    callbacks
  );

  pendingRelationChecks.add(
    statsDataId
  );

  scheduleRelationCheckFlush();
}

function scheduleRelationCheckFlush() {
  if (relationCheckTimer) {
    return;
  }

  relationCheckTimer =
    window.setTimeout(() => {
      relationCheckTimer = null;
      flushRelationChecks();
    }, 80);
}

async function flushRelationChecks() {
  const ids = Array.from(
    pendingRelationChecks
  );

  pendingRelationChecks.clear();

  if (!ids.length) {
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/v1/stats/relations/exists`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          statinfids: ids,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status}`
      );
    }

    const payload =
      await response.json();

    const items = Array.isArray(
      payload.items
    )
      ? payload.items
      : [];

    const results = new Map(
      items.map((item) => [
        item.statinfid,
        Boolean(item.has_relations),
      ])
    );

    for (const id of ids) {
      resolveRelationCheck(
        id,
        results.get(id) || false
      );
    }
  } catch (error) {
    console.error(
      "TUNAGU relation exists API error:",
      error
    );

    for (const id of ids) {
      resolveRelationCheck(id, false);
    }
  }
}

function resolveRelationCheck(
  statsDataId,
  hasRelations
) {
  relationAvailabilityCache.set(
    statsDataId,
    hasRelations
  );

  const callbacks =
    relationCheckCallbacks.get(
      statsDataId
    ) || [];

  relationCheckCallbacks.delete(
    statsDataId
  );

  for (const callback of callbacks) {
    callback(hasRelations);
  }
}

async function openDrawer(statsDataId) {
  const drawer = ensureDrawer();

  setDrawerOpen(drawer, true);

  drawer.querySelector(
    ".tunagu-drawer-body"
  ).innerHTML =
    '<p class="tunagu-muted">関連データを取得しています。</p>';

  try {
    const response = await fetch(
      `${API_BASE_URL}/v1/stats/${statsDataId}/relations`
    );

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status}`
      );
    }

    const payload =
      await response.json();

    renderRelations(
      drawer,
      payload
    );
  } catch (error) {
    console.error(
      "TUNAGU relation API error:",
      error
    );

    drawer.querySelector(
      ".tunagu-drawer-body"
    ).innerHTML =
      '<p class="tunagu-error">関連データを取得できませんでした。API が起動しているか確認してください。</p>';
  }
}

function setDrawerOpen(
  drawer,
  isOpen
) {
  drawer.classList.toggle(
    "is-open",
    isOpen
  );

  document
    .querySelector(
      ".tunagu-page-overlay"
    )
    ?.classList.toggle(
      "is-open",
      isOpen
    );

  if (!isOpen) {
    setDetailDrawerOpen(false);
  }
}

function closeDrawers() {
  const drawer =
    document.querySelector(
      ".tunagu-drawer"
    );

  if (drawer) {
    setDrawerOpen(drawer, false);
  }

  setDetailDrawerOpen(false);

  document
    .querySelector(
      ".tunagu-page-overlay"
    )
    ?.classList.remove("is-open");
}

function ensureDrawer() {
  let drawer =
    document.querySelector(
      ".tunagu-drawer"
    );

  if (drawer) {
    ensurePageOverlay(drawer);

    return drawer;
  }

  drawer =
    document.createElement(
      "aside"
    );

  drawer.className =
    "tunagu-drawer";

  drawer.innerHTML = `
    <header class="tunagu-drawer-header">
      <div>
        <p>統計データをつなぐ</p>
        <h2>関連統計データ</h2>
      </div>

      <button
        type="button"
        class="tunagu-close-button"
        aria-label="閉じる"
      >
        ${icons.close}
      </button>
    </header>

    <div class="tunagu-drawer-body"></div>
  `;

  drawer
    .querySelector(
      ".tunagu-close-button"
    )
    .addEventListener(
      "click",
      () => {
        setDrawerOpen(
          drawer,
          false
        );
      }
    );

  document.body.appendChild(
    drawer
  );

  ensurePageOverlay(drawer);

  return drawer;
}

function ensurePageOverlay(drawer) {
  let overlay =
    document.querySelector(
      ".tunagu-page-overlay"
    );

  if (overlay) {
    return overlay;
  }

  overlay =
    document.createElement(
      "div"
    );

  overlay.className =
    "tunagu-page-overlay";

  overlay.addEventListener(
    "click",
    () => {
      closeDrawers();
    }
  );

  document.body.appendChild(
    overlay
  );

  return overlay;
}

function ensureDetailDrawer() {
  let drawer =
    document.querySelector(
      ".tunagu-detail-drawer"
    );

  if (drawer) {
    return drawer;
  }

  drawer =
    document.createElement(
      "aside"
    );

  drawer.className =
    "tunagu-detail-drawer";

  drawer.innerHTML = `
    <header class="tunagu-detail-drawer-header">
      <div>
        <p>e-Stat 詳細</p>
        <h2>統計データ詳細</h2>
      </div>

      <div class="tunagu-detail-drawer-actions">
        <a
          class="tunagu-detail-open-link"
          href="#"
          target="_blank"
          rel="noreferrer"
        >
          別タブで開く
        </a>

        <button
          type="button"
          class="tunagu-close-button"
          aria-label="詳細を閉じる"
        >
          ${icons.close}
        </button>
      </div>
    </header>

    <iframe
      class="tunagu-detail-frame"
      title="統計データ詳細"
    ></iframe>
  `;

  drawer
    .querySelector(
      ".tunagu-close-button"
    )
    .addEventListener(
      "click",
      () => {
        setDetailDrawerOpen(false);
      }
    );

  document.body.appendChild(
    drawer
  );

  return drawer;
}

function openDetailDrawer(url) {
  const drawer =
    ensureDetailDrawer();

  const frame =
    drawer.querySelector(
      ".tunagu-detail-frame"
    );

  const openLink =
    drawer.querySelector(
      ".tunagu-detail-open-link"
    );

  frame.src = url;
  openLink.href = url;

  setDetailDrawerOpen(true);
}

function setDetailDrawerOpen(isOpen) {
  const drawer =
    document.querySelector(
      ".tunagu-detail-drawer"
    );

  if (!drawer) {
    return;
  }

  if (!isOpen) {
    drawer.remove();
    return;
  }

  drawer.classList.toggle(
    "is-open",
    isOpen
  );
}

function renderRelations(
  drawer,
  payload
) {
  const body =
    drawer.querySelector(
      ".tunagu-drawer-body"
    );

  const groups =
    normalizeRelationGroups(payload);

  const totalCount = groups.reduce(
    (sum, group) =>
      sum + group.items.length,
    0
  );

  const statsDataId =
    payload.statinfid ||
    payload.stats_data_id ||
    "";

  if (!totalCount) {
    body.innerHTML =
      '<p class="tunagu-muted">関連データはまだ登録されていません。</p>';

    return;
  }

  body.innerHTML = `
    <section class="tunagu-summary">
      <span class="tunagu-summary-icon">
        ${icons.list}
      </span>

      <div>
        <p>表示中の統計データ ID</p>
        <strong>
          ${escapeHtml(
            statsDataId
          )}
        </strong>
      </div>

      <span class="tunagu-summary-count">
        ${totalCount}件
      </span>
    </section>

    ${renderContactAction(
      statsDataId
    )}

    <div class="tunagu-actions">
      <button
        type="button"
        class="tunagu-select-all-button"
        data-tunagu-select-all="true"
      >
        ${icons.check}
        <span>すべて選択</span>
      </button>

      <a
        class="tunagu-download-button is-disabled"
        href="#"
        aria-disabled="true"
      >
        ${icons.download}
        <span>
          選択したものをダウンロード
        </span>
        <strong>0</strong>
      </a>
    </div>

    <div class="tunagu-relation-tabs">
      <div
        class="tunagu-tab-list"
        role="tablist"
        aria-label="関連データのまとまり"
      >
        ${groups
          .map(
            (group, index) =>
              renderRelationTab(
                group,
                index === 0
              )
          )
          .join("")}
      </div>

      <div class="tunagu-tab-panels">
        ${groups
          .map(
            (group, index) =>
              renderRelationPanel(
                group,
                index === 0,
                statsDataId
              )
          )
          .join("")}
      </div>
    </div>
  `;

  wireContactAction(
    body,
    statsDataId
  );

  wireTabControls(body);

  wireGroupDownloadControls(body);

  wireDetailLinks(body);

  wireSelectionControls(body);
}

function renderContactAction(
  statsDataId
) {
  return `
    <section class="tunagu-contact">
      <label class="tunagu-contact-field">
        <span>問い合わせ種別</span>

        <select
          class="tunagu-contact-select"
          aria-label="問い合わせ種別"
        >
          <option value="location">
            統計情報の所在に関する問い合わせ
          </option>

          <option value="content">
            データの内容に関する問い合わせ
          </option>

          <option value="other">
            その他の問い合わせ
          </option>
        </select>
      </label>

      <a
        class="tunagu-contact-button"
        href="${buildContactHref(
          {
            statsDataId,
            inquiryType:
              "location",
            selectedIds: [],
          }
        )}"
        target="_blank"
        rel="noreferrer"
      >
        ${icons.message}
        <span>問い合わせる</span>
      </a>
    </section>
  `;
}

function normalizeRelationGroups(payload) {
  const relations = Array.isArray(
    payload.relations
  )
    ? payload.relations
    : [];

  return relations
    .map((relation) => {
      const type =
        relationMeta[
          relation.relation_type
        ]
          ? relation.relation_type
          : "other";

      const related = Array.isArray(
        relation.related
      )
        ? relation.related
        : [];

      return {
        type,
        reason:
          relation.reason ||
          relationMeta[type]
            .description,
        items: related.map(
          (item) => ({
            ...item,
            statinfid:
              item.statinfid ||
              item.stats_data_id ||
              "",
          })
        ),
      };
    })
    .filter(
      (group) =>
        group.items.length > 0
    )
    .sort(
      (a, b) =>
        relationOrder.indexOf(a.type) -
        relationOrder.indexOf(b.type)
    );
}

function renderRelationTab(
  group,
  isActive
) {
  const meta =
    relationMeta[group.type] ||
    relationMeta.other;

  return `
    <button
      type="button"
      class="tunagu-tab-button"
      id="tunagu-tab-${group.type}"
      role="tab"
      aria-selected="${
        isActive
          ? "true"
          : "false"
      }"
      aria-controls="tunagu-panel-${group.type}"
      data-tunagu-tab="${group.type}"
    >
      <span class="tunagu-tab-icon">
        ${
          icons[meta.icon] ||
          icons.link
        }
      </span>

      <span>${meta.label}</span>

      <strong>
        ${group.items.length}
      </strong>
    </button>
  `;
}

function renderRelationPanel(
  group,
  isActive,
  currentStatsDataId
) {
  const meta =
    relationMeta[group.type] ||
    relationMeta.other;

  return `
    <section
      class="tunagu-tab-panel tunagu-relation-group-${group.type}"
      id="tunagu-panel-${group.type}"
      role="tabpanel"
      aria-labelledby="tunagu-tab-${group.type}"
      ${
        isActive
          ? ""
          : "hidden"
      }
    >
      <div class="tunagu-panel-header">
        <div>
          <h3>
            ${meta.label}
          </h3>

          <p>
            ${meta.description}
            ${group.reason
              ? `<br><span class="tunagu-reason">${escapeHtml(
                  group.reason
                )}</span>`
              : ""}
          </p>
        </div>

        <button
          type="button"
          class="tunagu-group-download"
        >
          ${icons.download}
          <span>
            このまとまり
          </span>
        </button>
      </div>

      <div class="tunagu-table-wrap">
        <table class="tunagu-relation-table">
          <thead>
            <tr>
              <th
                scope="col"
                class="tunagu-check-column"
              >
                選択
              </th>

              <th
                scope="col"
                class="tunagu-id-column"
              >
                ID
              </th>

              <th
                scope="col"
                class="tunagu-survey-date-column"
              >
                調査年
              </th>

              <th scope="col">
                形式
              </th>

              <th
                scope="col"
                class="tunagu-detail-column"
              >
                詳細
              </th>

            </tr>
          </thead>

          <tbody>
            ${group.items
              .map((item) =>
                renderRelationRow(
                  item,
                  currentStatsDataId
                )
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderRelationRow(
  item,
  currentStatsDataId
) {
  const statinfid =
    item.statinfid ||
    item.stats_data_id ||
    "";

  const isCurrent =
    statinfid === currentStatsDataId;

  return `
    <tr class="tunagu-relation-row${
      isCurrent
        ? " is-current"
        : ""
    }">
      <td>
        <label class="tunagu-select-control">
          <input
            type="checkbox"
            class="tunagu-relation-checkbox"
            value="${escapeHtml(
              statinfid
            )}"
            checked
          />

          <span>
            ${icons.check}
          </span>
        </label>
      </td>

      <td class="tunagu-id-cell">
        ${escapeHtml(
          statinfid
        )}
        ${
          isCurrent
            ? '<span class="tunagu-current-badge">現在表示中</span>'
            : ""
        }
      </td>

      <td class="tunagu-survey-date-cell">
        ${renderSurveyYear(item)}
      </td>

      <td>
        ${renderFormatBadges(
          item.formats,
          statinfid,
          getSurveyDateLabel(item)
        )}
      </td>

      <td>
        <a
          class="tunagu-detail-link"
          href="${buildStatsDataDetailUrl(
            statinfid
          )}"
          target="_blank"
          rel="noreferrer"
          aria-label="統計データ ID ${escapeHtml(
            statinfid
          )} の詳細を開く"
        >
          詳細
        </a>
      </td>
    </tr>
  `;
}

function renderSurveyYear(item) {
  return escapeHtml(
    getSurveyDateLabel(item)
  );
}

function getSurveyDateLabel(item) {
  const dateFrom =
    item.survey_date_from ||
    item.survey_year_from;

  const dateTo =
    item.survey_date_to ||
    item.survey_year_to;

  if (
    !dateFrom &&
    !dateTo
  ) {
    return "調査年不明";
  }

  if (
    dateFrom === dateTo ||
    !dateTo
  ) {
    return formatSurveyDate(dateFrom);
  }

  if (!dateFrom) {
    return formatSurveyDate(dateTo);
  }

  return `${formatSurveyDate(
    dateFrom
  )}–${formatSurveyDate(
    dateTo
  )}`;
}

function formatSurveyDate(value) {
  const text = String(value || "");

  if (/^\d{6}$/.test(text)) {
    return `${text.slice(0, 4)}年${Number(
      text.slice(4)
    )}月`;
  }

  if (/^\d{4}$/.test(text)) {
    return `${text}年`;
  }

  return text;
}

function renderFormatBadges(
  formats,
  statinfid,
  surveyDateLabel
) {
  const normalizedFormats =
    Array.isArray(formats) &&
    formats.length
      ? formats
      : ["未確認"];

  return `
    <div
      class="tunagu-format-list"
      aria-label="提供形式"
    >
      ${normalizedFormats
        .map(
          (format) => {
            const fileKind =
              getFileKind(format);
            const downloadUrl =
              buildFileDownloadUrl(
                statinfid,
                format
              );

            if (!downloadUrl) {
              return `<span class="tunagu-format-badge is-disabled">${escapeHtml(
                format
              )}</span>`;
            }

            return `
              <a
                class="tunagu-format-badge stat-dl_icon stat-icon_${fileKind} stat-icon_format js-dl stat-download_icon_left"
                href="${downloadUrl}"
                data-file_type="${escapeHtml(
                  normalizeFormatLabel(
                    format
                  )
                )}"
                data-filename="${escapeHtml(
                  buildDownloadFilename(
                    statinfid,
                    surveyDateLabel,
                    format
                  )
                )}"
                data-filename-suffix="${escapeHtml(
                  surveyDateLabel
                )}"
                aria-label="${escapeHtml(
                  normalizeFormatLabel(
                    format
                  )
                )}形式をダウンロード"
              >
                ${escapeHtml(
                  normalizeFormatLabel(
                    format
                  )
                )}
              </a>
            `;
          }
        )
        .join("")}
    </div>
  `;
}

function wireSelectionControls(
  root
) {
  const checkboxes = Array.from(
    root.querySelectorAll(
      ".tunagu-relation-checkbox"
    )
  );

  const download =
    root.querySelector(
      ".tunagu-download-button"
    );

  const selectAll =
    root.querySelector(
      ".tunagu-select-all-button"
    );

  const update = () => {
    const selectedCheckboxes =
      checkboxes
        .filter(
          (checkbox) =>
            checkbox.checked
        );

    const downloadLinks =
      getSelectedFormatDownloadLinks(
        selectedCheckboxes
      );

    download.querySelector(
      "strong"
    ).textContent = String(
      selectedCheckboxes.length
    );

    download.classList.toggle(
      "is-disabled",
      downloadLinks.length === 0
    );

    download.setAttribute(
      "aria-disabled",
      downloadLinks.length === 0
        ? "true"
        : "false"
    );

    selectAll.querySelector(
      "span"
    ).textContent =
      selectedCheckboxes.length ===
      checkboxes.length
        ? "すべて解除"
        : "すべて選択";

    updateContactHref(root);
  };

  for (const checkbox of checkboxes) {
    checkbox.addEventListener(
      "change",
      update
    );
  }

  selectAll.addEventListener(
    "click",
    () => {
      const shouldSelect =
        checkboxes.some(
          (checkbox) =>
            !checkbox.checked
        );

      for (
        const checkbox of checkboxes
      ) {
        checkbox.checked =
          shouldSelect;
      }

      update();
    }
  );

  download.addEventListener(
    "click",
    (event) => {
      event.preventDefault();

      if (
        download.getAttribute(
          "aria-disabled"
        ) === "true"
      ) {
        return;
      }

      runSelectedFormatDownloads(
        checkboxes
      );
    }
  );

  update();
}

function wireGroupDownloadControls(root) {
  const buttons = Array.from(
    root.querySelectorAll(
      ".tunagu-group-download"
    )
  );

  for (const button of buttons) {
    button.addEventListener(
      "click",
      () => {
        const panel =
          button.closest(
            ".tunagu-tab-panel"
          );

        runFormatDownloadsInRoot(
          panel
        );
      }
    );
  }
}

function wireDetailLinks(root) {
  const links = Array.from(
    root.querySelectorAll(
      ".tunagu-detail-link"
    )
  );

  for (const link of links) {
    link.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        openDetailDrawer(link.href);
      }
    );
  }
}

function getSelectedFormatDownloadLinks(
  selectedCheckboxes
) {
  return selectedCheckboxes.flatMap(
    (checkbox) => {
      const row =
        checkbox.closest(
          ".tunagu-relation-row"
        );

      return Array.from(
        row?.querySelectorAll(
          ".tunagu-format-badge[href]"
        ) || []
      );
    }
  );
}

function runSelectedFormatDownloads(
  checkboxes
) {
  const selectedCheckboxes =
    checkboxes.filter(
      (checkbox) =>
        checkbox.checked
    );

  const links =
    getSelectedFormatDownloadLinks(
      selectedCheckboxes
    );

  runFormatDownloads(links);
}

function runFormatDownloadsInRoot(root) {
  const links = Array.from(
    root?.querySelectorAll(
      ".tunagu-format-badge[href]"
    ) || []
  );

  runFormatDownloads(links);
}

function runFormatDownloads(links) {
  const items = links
    .map((link) =>
      ({
        url: link.href,
        filename:
          link.dataset.filename || "",
        filenameSuffix:
          link.dataset.filenameSuffix ||
          "",
      })
    )
    .filter((item) => item.url);

  if (!items.length) {
    return;
  }

  if (
    typeof chrome !== "undefined" &&
    chrome.runtime?.sendMessage
  ) {
    chrome.runtime.sendMessage(
      {
        type: "TUNAGU_DOWNLOAD_URLS",
        items,
      },
      (response) => {
        if (
          chrome.runtime.lastError ||
          response?.ok === false
        ) {
          console.error(
            "TUNAGU download request failed:",
            chrome.runtime.lastError ||
              response
          );
          fallbackOpenDownloadUrls(
            items
          );
        }
      }
    );

    return;
  }

  fallbackOpenDownloadUrls(items);
}

function fallbackOpenDownloadUrls(items) {
  for (const item of items) {
    window.open(item.url, "_blank");
  }
}

function wireTabControls(root) {
  const tabs = Array.from(
    root.querySelectorAll(
      ".tunagu-tab-button"
    )
  );

  const panels = Array.from(
    root.querySelectorAll(
      ".tunagu-tab-panel"
    )
  );

  const activate = (
    selectedTab
  ) => {
    for (const tab of tabs) {
      const isSelected =
        tab === selectedTab;

      tab.setAttribute(
        "aria-selected",
        isSelected
          ? "true"
          : "false"
      );
    }

    for (const panel of panels) {
      panel.hidden =
        panel.id !==
        selectedTab.getAttribute(
          "aria-controls"
        );
    }
  };

  for (const tab of tabs) {
    tab.addEventListener(
      "click",
      () => activate(tab)
    );
  }
}

function wireContactAction(
  root,
  statsDataId
) {
  const select =
    root.querySelector(
      ".tunagu-contact-select"
    );

  const button =
    root.querySelector(
      ".tunagu-contact-button"
    );

  if (!select || !button) {
    return;
  }

  button.dataset.statsDataId =
    statsDataId;

  select.addEventListener(
    "change",
    () => {
      updateContactHref(root);
    }
  );

  button.addEventListener(
    "click",
    () => {
      updateContactHref(root);
    }
  );

  updateContactHref(root);
}

function updateContactHref(root) {
  const select =
    root.querySelector(
      ".tunagu-contact-select"
    );

  const button =
    root.querySelector(
      ".tunagu-contact-button"
    );

  if (!select || !button) {
    return;
  }

  const selectedIds = Array.from(
    root.querySelectorAll(
      ".tunagu-relation-checkbox:checked"
    )
  ).map(
    (checkbox) =>
      checkbox.value
  );

  button.href = buildContactHref({
    statsDataId:
      button.dataset.statsDataId ||
      "",
    inquiryType: select.value,
    selectedIds,
  });
}

function buildContactHref({
  statsDataId,
  inquiryType,
  selectedIds,
}
) {
  const labels = {
    location:
      "データの所在に関する問い合わせ",

    content:
      "データの内容に関する問い合わせ",

    other:
      "その他の問い合わせ",
  };

  const inquiryLabel =
    labels[inquiryType] ||
    labels.other;

  const subjectLabels = {
    location:
      "統計情報の所在に関する問い合わせ",

    content:
      "データの内容に関する問い合わせ",

    other:
      "その他の問い合わせ",
  };

  const subjectLabel =
    subjectLabels[inquiryType] ||
    subjectLabels.other;

  const message = [
    `参照ページ: ${buildStatsDataPageUrl(
      statsDataId
    )}`,
    "",
    "問い合わせ内容:",
  ]
    .filter((line) => line !== "")
    .join("\n");

  const params =
    new URLSearchParams();

  params.set(
    "tunagu_inquiry",
    inquiryType
  );

  params.set(
    "tunagu_subject",
    subjectLabel
  );

  params.set(
    "tunagu_message",
    message
  );

  return `https://www.e-stat.go.jp/contact?${params.toString()}`;
}

function buildBulkDownloadUrl(ids) {
  const params =
    new URLSearchParams();

  params.set(
    "statsDataIds",
    ids.join(",")
  );

  return `${API_BASE_URL}/v1/downloads/bulk?${params.toString()}`;
}

function buildStatsDataPageUrl(statsDataId) {
  const params =
    new URLSearchParams();

  params.set("page", "1");
  params.set(
    "stat_infid",
    statsDataId
  );

  return `https://www.e-stat.go.jp/stat-search/files?${params.toString()}`;
}

function buildStatsDataDetailUrl(statsDataId) {
  const params =
    new URLSearchParams();

  params.set(
    "stat_infid",
    statsDataId
  );

  return `https://www.e-stat.go.jp/stat-search/files?${params.toString()}`;
}

function buildFileDownloadUrl(
  statinfid,
  format
) {
  const fileKind =
    getFileKind(format);

  if (
    !statinfid ||
    fileKind === null
  ) {
    return null;
  }

  const params =
    new URLSearchParams();

  params.set("statInfId", statinfid);
  params.set("fileKind", fileKind);

  return `https://www.e-stat.go.jp/stat-search/file-download?${params.toString()}`;
}

function getFileKind(format) {
  const normalized = String(format || "")
    .trim()
    .toUpperCase();

  if (
    normalized === "XLS" ||
    normalized === "XLSX" ||
    normalized === "EXCEL"
  ) {
    return "0";
  }

  if (normalized === "CSV") {
    return "1";
  }

  if (normalized === "PDF") {
    return "2";
  }

  if (normalized === "XML") {
    return "3";
  }

  return null;
}

function normalizeFormatLabel(format) {
  const normalized = String(format || "")
    .trim()
    .toUpperCase();

  if (
    normalized === "XLS" ||
    normalized === "XLSX"
  ) {
    return "EXCEL";
  }

  return normalized;
}

function buildDownloadFilename(
  statinfid,
  surveyDateLabel,
  format
) {
  const label =
    normalizeFormatLabel(format);

  const extension =
    getFileExtension(label);

  const baseName = [
    statinfid,
    surveyDateLabel,
    label,
  ]
    .filter(Boolean)
    .join("_");

  return `${sanitizeFilename(
    baseName
  )}.${extension}`;
}

function getFileExtension(formatLabel) {
  const normalized = String(
    formatLabel || ""
  ).toUpperCase();

  if (normalized === "EXCEL") {
    return "xls";
  }

  if (normalized === "CSV") {
    return "csv";
  }

  if (normalized === "PDF") {
    return "pdf";
  }

  if (normalized === "XML") {
    return "xml";
  }

  return "dat";
}

function sanitizeFilename(value) {
  return String(value || "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll(
      "'",
      "&#039;"
    );
}

function prefillContactMessage() {
  if (
    window.location.pathname !==
    "/contact"
  ) {
    return false;
  }

  const params =
    new URLSearchParams(
      window.location.search
    );

  const message =
    params.get("tunagu_message");

  const subject =
    params.get("tunagu_subject") ||
    getContactSubjectLabel(
      params.get("tunagu_inquiry")
    );

  if (!message) {
    return false;
  }

  selectContactSubject(subject);

  const field =
    findContactMessageField();

  if (!field) {
    return false;
  }

  if (!field.value) {
    field.value = message;
    field.dispatchEvent(
      new Event("input", {
        bubbles: true,
      })
    );
    field.dispatchEvent(
      new Event("change", {
        bubbles: true,
      })
    );
  }

  return true;
}

function getContactSubjectLabel(inquiryType) {
  const labels = {
    location:
      "統計情報の所在に関する問い合わせ",

    content:
      "データの内容に関する問い合わせ",

    other:
      "その他の問い合わせ",
  };

  return labels[inquiryType] || "";
}

function selectContactSubject(subject) {
  if (!subject) {
    return false;
  }

  if (selectOptionByText(subject)) {
    return true;
  }

  return checkInputByLabelText(subject);
}

function selectOptionByText(optionText) {
  const selects = Array.from(
    document.querySelectorAll("select")
  );

  for (const select of selects) {
    const options = Array.from(
      select.options || []
    );

    const option = options.find(
      (item) =>
        normalizeText(item.textContent) ===
        normalizeText(optionText)
    );

    if (!option) {
      continue;
    }

    select.value = option.value;
    select.dispatchEvent(
      new Event("input", {
        bubbles: true,
      })
    );
    select.dispatchEvent(
      new Event("change", {
        bubbles: true,
      })
    );

    return true;
  }

  return false;
}

function checkInputByLabelText(labelText) {
  const labels = Array.from(
    document.querySelectorAll("label")
  );

  const label = labels.find(
    (item) =>
      normalizeText(item.textContent) ===
      normalizeText(labelText)
  );

  const input =
    label?.control ||
    label?.querySelector(
      'input[type="radio"], input[type="checkbox"]'
    );

  if (!input) {
    return false;
  }

  input.checked = true;
  input.dispatchEvent(
    new Event("input", {
      bubbles: true,
    })
  );
  input.dispatchEvent(
    new Event("change", {
      bubbles: true,
    })
  );

  return true;
}

function findContactMessageField() {
  const selectors = [
    "textarea",
    '[name*="message" i]',
    '[id*="message" i]',
    '[name*="content" i]',
    '[id*="content" i]',
    '[name*="body" i]',
    '[id*="body" i]',
    '[name*="naiyo" i]',
    '[id*="naiyo" i]',
    '[name*="comment" i]',
    '[id*="comment" i]',
  ];

  for (const selector of selectors) {
    const field =
      document.querySelector(
        selector
      );

    if (
      field &&
      "value" in field
    ) {
      return field;
    }
  }

  return null;
}

function initializeTunagu() {
  prefillContactMessage();

  const statsDataId =
    findStatsDataId();

  if (statsDataId) {
    ensureButton(statsDataId);
    return;
  }

  ensureResultTableButtons();
  ensureDatasetListButtons();
}

initializeTunagu();

const observer =
  new MutationObserver(() => {
    prefillContactMessage();
    ensureResultTableButtons();
    ensureDatasetListButtons();
  });

observer.observe(
  document.body,
  {
    childList: true,
    subtree: true,
  }
);
