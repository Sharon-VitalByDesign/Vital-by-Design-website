const menuButton = document.querySelector(".menu-button");
const nav = document.querySelector(".nav");

menuButton?.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("is-open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
});

nav?.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const dropdownToggle = target?.closest(".nav-group > a span[aria-hidden='true']");

  if (dropdownToggle) {
    event.preventDefault();
    const group = dropdownToggle.closest(".nav-group");
    const isOpen = group.classList.toggle("is-open");

    document.querySelectorAll(".nav-group.is-open").forEach((openGroup) => {
      if (openGroup !== group) openGroup.classList.remove("is-open");
    });

    group.querySelector(":scope > a")?.setAttribute("aria-expanded", String(isOpen));
    return;
  }

  if (event.target instanceof HTMLAnchorElement && !event.target.closest(".nav-group")) {
    nav.classList.remove("is-open");
    menuButton?.setAttribute("aria-expanded", "false");
  }
});

document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest(".nav-group")) return;

  document.querySelectorAll(".nav-group.is-open").forEach((group) => {
    group.classList.remove("is-open");
    group.querySelector(":scope > a")?.setAttribute("aria-expanded", "false");
  });
});

const ransomTargets = document.querySelectorAll(
  ".portal-panel h2, .content-card h2, .resource-section h2, .page-intro h1"
);

ransomTargets.forEach((heading) => {
  const text = heading.textContent?.trim();
  if (!text || heading.dataset.ransomReady) return;

  heading.dataset.ransomReady = "true";
  heading.classList.add("ransom-heading");
  heading.setAttribute("aria-label", text);
  heading.textContent = "";

  text.split(" ").forEach((word, wordIndex) => {
    const wordSpan = document.createElement("span");
    wordSpan.className = "ransom-word";
    wordSpan.setAttribute("aria-hidden", "true");

    [...word].forEach((character, characterIndex) => {
      const letterIndex = wordIndex * 7 + characterIndex;
      const span = document.createElement("span");
      span.className = "ransom-letter";
      span.textContent = character;
      span.style.setProperty("--tilt", `${((letterIndex % 5) - 2) * 1.8}deg`);
      span.style.setProperty("--lift", `${letterIndex % 2 === 0 ? "-0.015em" : "0.025em"}`);
      wordSpan.append(span);
    });

    heading.append(wordSpan);

    if (wordIndex < text.split(" ").length - 1) {
      const space = document.createElement("span");
      space.className = "ransom-space";
      space.setAttribute("aria-hidden", "true");
      heading.append(space);
    }
  });
});

const RESOURCE_SHEET_ID = "1uvMyNAB2jmuC7ShdQGKz3MdA8Gio6P95F5GdKWMhh1E";
const RESOURCE_SHEET_NAME = "Sheet1";

const catalogRoot = document.querySelector("[data-resource-catalog]");

function cleanCell(value) {
  return String(value ?? "")
    .replace(/^"+|"+$/g, "")
    .trim();
}

function splitTags(value) {
  const text = cleanCell(value);
  if (!text) return [];

  const tags = [];
  let current = "";
  let inQuotes = false;

  [...text].forEach((character) => {
    if (character === '"') {
      inQuotes = !inQuotes;
      return;
    }

    if (character === "," && !inQuotes) {
      if (current.trim()) tags.push(cleanCell(current));
      current = "";
      return;
    }

    current += character;
  });

  if (current.trim()) tags.push(cleanCell(current));
  return tags;
}

function normalizeToken(value) {
  return cleanCell(value).toLowerCase().replace(/&/g, "and");
}

function rowBelongsInCatalog(row, catalogName) {
  const sections = splitTags(row.Section);
  return sections.some((section) => normalizeToken(section) === normalizeToken(catalogName));
}

function rowMatchesSection(row, sectionName) {
  const haystack = [
    ...splitTags(row.Section),
    ...splitTags(row.Subsection),
    row.Title,
  ].map(normalizeToken);
  const target = normalizeToken(sectionName);

  if (target === "tools and templates") {
    return haystack.some((item) => item.includes("tools") || item.includes("templates"));
  }

  if (target === "frameworks") {
    return haystack.some((item) => item.includes("framework"));
  }

  if (target === "gamemaker resources") {
    return haystack.some((item) => item.includes("gamemaker") || item.includes("game-based"));
  }

  if (target === "game-based design") {
    return haystack.some((item) => item.includes("gamemaker") || item.includes("game-based") || item.includes("gameful"));
  }

  if (target === "custom ai tools") {
    return haystack.some(
      (item) => item.includes("custom ai") || item.includes("ai tool") || item.includes("app")
    );
  }

  if (target === "featured session") {
    return cleanCell(row.Featured).toLowerCase() === "yes";
  }

  if (target === "workshop tools") {
    return haystack.some((item) => item.includes("workshop") || item.includes("tools") || item.includes("prompt"));
  }

  if (target === "session follow-ups") {
    return haystack.some((item) => item.includes("follow") || item.includes("handout") || item.includes("slides"));
  }

  return haystack.some((item) => item.includes(target));
}

function getDriveFileId(url) {
  const text = cleanCell(url);
  if (!text.includes("drive.google.com")) return "";

  const fileMatch = text.match(/\/file\/d\/([^/]+)/);
  if (fileMatch) return fileMatch[1];

  const idMatch = text.match(/[?&]id=([^&]+)/);
  if (idMatch) return idMatch[1];

  return "";
}

function getThumbnailUrl(row) {
  const thumbnail = cleanCell(row["Thumbnail Image"]);
  if (!thumbnail) return "";

  const driveId = getDriveFileId(thumbnail);
  if (driveId) return `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`;

  return thumbnail;
}

function getResourceInitials(title) {
  return cleanCell(title)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function makeResourceCard(row) {
  const card = document.createElement("article");
  card.className = `resource-card ${cleanCell(row.Featured).toLowerCase() === "yes" ? "is-featured" : ""}`;

  const resourceUrl = cleanCell(row.Link);
  const thumbnailUrl = getThumbnailUrl(row);

  const thumbLink = document.createElement("a");
  thumbLink.className = "resource-thumb";
  thumbLink.href = resourceUrl;
  thumbLink.target = "_blank";
  thumbLink.rel = "noopener";
  thumbLink.setAttribute("aria-label", `Open ${cleanCell(row.Title)}`);

  if (thumbnailUrl) {
    const image = document.createElement("img");
    image.src = thumbnailUrl;
    image.alt = "";
    image.loading = "lazy";
    thumbLink.append(image);
  } else {
    const fallback = document.createElement("span");
    fallback.className = "resource-thumb-fallback";
    fallback.textContent = getResourceInitials(row.Title);
    thumbLink.append(fallback);
  }

  const title = document.createElement("h3");
  const titleLink = document.createElement("a");
  titleLink.href = resourceUrl;
  titleLink.target = "_blank";
  titleLink.rel = "noopener";
  titleLink.textContent = cleanCell(row.Title);
  title.append(titleLink);

  const description = document.createElement("p");
  description.textContent = cleanCell(row.Description);

  card.append(thumbLink, title, description);
  return card;
}

function getCellValue(cell) {
  if (!cell) return "";
  if (cell.v !== undefined && cell.v !== null) return cell.v;
  if (cell.f !== undefined && cell.f !== null) return cell.f;
  return "";
}

function parseGoogleSheetPayload(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  const payload = JSON.parse(text.slice(start, end + 1));
  const headers = payload.table.cols.map((column) => cleanCell(column.label));

  return payload.table.rows
    .map((row) => row.c.map(getCellValue))
    .filter((row) => row.some((cell) => cleanCell(cell)))
    .map((row) =>
      headers.reduce((record, header, index) => {
        record[header] = row[index] ?? "";
        return record;
      }, {})
    );
}

async function loadResourceCatalog() {
  if (!catalogRoot) return;

  const catalogName = catalogRoot.dataset.resourceCatalog;
  const sections = [...catalogRoot.querySelectorAll("[data-resource-section]")];
  const callbackName = `handleResourceCatalog_${Date.now()}`;
  const endpoint = `https://docs.google.com/spreadsheets/d/${RESOURCE_SHEET_ID}/gviz/tq?tqx=out:json;responseHandler:${callbackName}&sheet=${encodeURIComponent(RESOURCE_SHEET_NAME)}`;

  sections.forEach((section) => {
    section.querySelector("[data-resource-list]").innerHTML = '<p class="resource-empty">Loading resources...</p>';
  });

  function renderRows(rawRows) {
    const rows = rawRows
      .filter((row) => cleanCell(row.Status).toLowerCase() === "published")
      .filter((row) => cleanCell(row.Link))
      .filter((row) => rowBelongsInCatalog(row, catalogName))
      .sort((a, b) => Number(a["Sort Order"] || 999) - Number(b["Sort Order"] || 999));

    sections.forEach((section) => {
      const list = section.querySelector("[data-resource-list]");
      const matches = rows.filter((row) => rowMatchesSection(row, section.dataset.resourceSection));
      list.innerHTML = "";

      if (!matches.length) {
        list.innerHTML = '<p class="resource-empty">No published resources here yet.</p>';
        return;
      }

      matches.forEach((row) => list.append(makeResourceCard(row)));
    });
  }

  try {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const timeout = window.setTimeout(() => {
        delete window[callbackName];
        script.remove();
        reject(new Error("Sheet request timed out"));
      }, 8000);

      window[callbackName] = (payload) => {
        window.clearTimeout(timeout);
        delete window[callbackName];
        script.remove();
        const rows = parseGoogleSheetPayload(`${callbackName}(${JSON.stringify(payload)})`);
        renderRows(rows);
        resolve();
      };

      script.onerror = () => {
        window.clearTimeout(timeout);
        delete window[callbackName];
        script.remove();
        reject(new Error("Sheet request failed"));
      };

      script.src = endpoint;
      document.head.append(script);
    });
  } catch (error) {
    sections.forEach((section) => {
      section.querySelector("[data-resource-list]").innerHTML =
        '<p class="resource-empty">Resource catalog could not load. Check that the Google Sheet is public or published to the web.</p>';
    });
  }
}

loadResourceCatalog();
