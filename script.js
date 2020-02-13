const result = document.getElementById("wiki-result");
const form = document.getElementById("wiki-form");
const fieldset = document.getElementById("wiki-form-fieldset");

form.addEventListener("submit", async event => {
  event.preventDefault();
  try {
    render(elt("h3", null, "Loading..."));

    const formData = Object.fromEntries(new FormData(event.target).entries());
    fieldset.disabled = true;

    if (!formData.language || !formData.query) {
      throw new Error("Please input the search query");
    }
    const res = await fetch(getApiUrl(formData));
    const { toc, detail } = await res.json();
    if (toc) {
      if (["ar", "he"].includes(formData.language)) {
        document.body.style.direction = "rtl";
      } else {
        document.body.style.direction = "ltr";
      }

      render(
        Toc({
          articleUrl: getArticleURl(formData),
          toc: createTocTree(toc)
        })
      );
    } else {
      throw new Error(detail);
    }
  } catch (error) {
    console.error(error);
    renderError(error);
  } finally {
    fieldset.disabled = false;
  }
});

function getApiUrl({ language, query }) {
  return `https://${language}.wikipedia.org/api/rest_v1/page/metadata/${query}`;
}

function getArticleURl({ language, query }) {
  return `https://${language}.wikipedia.org/wiki/${query}`;
}

function createTocTree(toc) {
  const result = { ...toc, children: [] };
  let currentParent = result;
  let lastEntry = null;
  let lastParent = currentParent;
  for (const entry of toc.entries) {
    if (lastEntry) {
      if (entry.level > lastEntry.level) {
        lastParent = currentParent;
        currentParent = lastEntry;
      }

      if (entry.level < lastEntry.level) {
        currentParent = lastParent;
      }
    }

    if (!currentParent.children) {
      currentParent.children = [];
    }
    currentParent.children.push(entry);
    lastEntry = entry;
  }
  return result;
}

function Toc({ toc, articleUrl }) {
  if (!toc) {
    return null;
  }
  return elt("div", null, TocList({ ...toc, articleUrl }));
}

const domParser = new DOMParser();
function parseHTML(html) {
  const body = domParser
    .parseFromString(html, "text/html")
    .querySelector("body");
  return body.childNodes;
}

function TocList({ children, articleUrl }) {
  if (!children) {
    return null;
  }
  return elt(
    "ol",
    null,
    ...children.map(child =>
      elt(
        "li",
        null,
        elt(
          "a",
          {
            href: `${articleUrl}#${child.anchor}`,
            target: "_blank",
            rel: "noopener noreferrer"
          },
          ...parseHTML(child.html)
        ),
        TocList({ ...child, articleUrl })
      )
    )
  );
}

function render(dom) {
  if (result.firstChild) {
    result.firstChild.remove();
  }
  result.appendChild(dom);
}
const showStack = false;
function renderError(error) {
  console.error(error);
  const stack = showStack ? ["\n", error.stack] : [];
  return render(elt("pre", { class: "wiki-error" }, error.message, ...stack));
}

function elt(name, attributes) {
  try {
    var node = document.createElement(name);
    if (attributes) {
      for (var attr in attributes) {
        if (attributes.hasOwnProperty(attr)) {
          node.setAttribute(attr, attributes[attr]);
        } else {
          node[attr] = attributes[attr];
        }
      }
    }
    for (var i = 2; i < arguments.length; i++) {
      var child = arguments[i];
      if (typeof child == "string" || typeof child == "number") {
        child = document.createTextNode(child);
      }
      if (child !== undefined && child !== null) {
        node.appendChild(child);
      }
    }
    return node;
  } catch (error) {
    renderError(error);
  }
}
