chrome.runtime.onMessage.addListener(
  (message, _sender, sendResponse) => {
    if (
      message?.type !==
      "TUNAGU_DOWNLOAD_URLS"
    ) {
      return false;
    }

    downloadItems(
      message.items ||
        (message.urls || []).map(
          (url) => ({ url })
        )
    )
      .then((count) => {
        sendResponse({
          ok: true,
          count,
        });
      })
      .catch((error) => {
        console.error(
          "TUNAGU download error:",
          error
        );

        sendResponse({
          ok: false,
          message:
            error?.message ||
            String(error),
        });
      });

    return true;
  }
);

async function downloadItems(items) {
  const uniqueItems = dedupeDownloadItems(
    items
  );

  for (const item of uniqueItems) {
    const filename =
      await resolveDownloadFilename(
        item
      );

    await chrome.downloads.download({
      url: item.url,
      filename,
      conflictAction: "uniquify",
      saveAs: false,
    });
  }

  return uniqueItems.length;
}

function dedupeDownloadItems(items) {
  const seen = new Set();
  const results = [];

  for (const item of items) {
    if (
      !item?.url ||
      !/^https:\/\/www\.e-stat\.go\.jp\//.test(
        item.url
      )
    ) {
      continue;
    }

    const key = `${item.url}\n${
      item.filename || ""
    }`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    results.push({
      url: item.url,
      filename:
        sanitizeDownloadFilename(
          item.filename
        ),
      filenameSuffix:
        sanitizeFilenamePart(
          item.filenameSuffix
        ),
    });
  }

  return results;
}

async function resolveDownloadFilename(item) {
  const originalFilename =
    await fetchOriginalFilename(
      item.url
    );

  if (originalFilename) {
    return appendSuffixToFilename(
      originalFilename,
      item.filenameSuffix
    );
  }

  return item.filename || undefined;
}

async function fetchOriginalFilename(url) {
  try {
    const response = await fetch(url, {
      method: "GET",
    });

    const disposition =
      response.headers.get(
        "content-disposition"
      );

    return parseContentDispositionFilename(
      disposition
    );
  } catch (error) {
    console.warn(
      "TUNAGU original filename fetch failed:",
      error
    );

    return null;
  }
}

function parseContentDispositionFilename(
  disposition
) {
  if (!disposition) {
    return null;
  }

  const encodedMatch =
    disposition.match(
      /filename\*=UTF-8''([^;]+)/i
    );

  if (encodedMatch) {
    return safeDecodeURIComponent(
      encodedMatch[1].trim()
    );
  }

  const quotedMatch =
    disposition.match(
      /filename="([^"]+)"/i
    );

  if (quotedMatch) {
    return quotedMatch[1].trim();
  }

  const plainMatch =
    disposition.match(
      /filename=([^;]+)/i
    );

  return plainMatch?.[1]?.trim() || null;
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch (_error) {
    return value;
  }
}

function appendSuffixToFilename(
  filename,
  suffix
) {
  const safeFilename =
    sanitizeDownloadFilename(filename);
  const safeSuffix =
    sanitizeFilenamePart(suffix);

  if (!safeFilename || !safeSuffix) {
    return safeFilename || undefined;
  }

  const dotIndex =
    safeFilename.lastIndexOf(".");

  if (dotIndex <= 0) {
    return `${safeFilename}_${safeSuffix}`;
  }

  return `${safeFilename.slice(
    0,
    dotIndex
  )}_${safeSuffix}${safeFilename.slice(
    dotIndex
  )}`;
}

function sanitizeDownloadFilename(filename) {
  const value = String(filename || "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return value || undefined;
}

function sanitizeFilenamePart(value) {
  return String(value || "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}
