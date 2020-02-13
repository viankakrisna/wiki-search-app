const result = document.getElementById("wiki-result");
const form = document.getElementById("wiki-form");
const fieldset = document.getElementById("wiki-form-fieldset");

// We're using submit here so it follows the regular form submit UX
// That way, we got the enter key and button click working
form.addEventListener("submit", async event => {
  // To prevent the navigation. We'll use fetch and update the dom based on
  // the data we got from the api
  event.preventDefault();
  try {
    // this will break on the older browser.
    const formData = Object.fromEntries(new FormData(event.target).entries());

    // early exit if the required data is not there
    if (!formData.query) {
      throw new Error("Please input the search query");
    }

    // this is unlikely to happen because it's a select element
    // but just in case
    if (!formData.language) {
      throw new Error("Please select the language to search");
    }

    // prevent the user to mess with the form while it's loading
    fieldset.disabled = true;

    // renders a loading message so the user knows that the input
    // is being processed
    render(elt("h3", null, "Loading..."));

    const res = await fetch(getApiUrl(formData));
    const { toc, detail } = await res.json();

    // if we have a toc propery, this request is probably okay
    if (toc) {
      // switch the body style direction based on the selected language
      if (["ar", "he"].includes(formData.language)) {
        document.body.style.direction = "rtl";
      } else {
        document.body.style.direction = "ltr";
      }

      // this is where we update the dom with the list
      render(
        TocList({
          ...createTocTree(toc),
          articleUrl: getArticleURl(formData)
        })
      );
    } else {
      // wikipedia api will give us the error message, throw this so we could render it
      throw new Error(detail);
    }
  } catch (error) {
    renderError(error);
  } finally {
    // The very important bit. without this the user can't use our app anymore
    fieldset.disabled = false;
  }
});

function getApiUrl({ language, query }) {
  return `https://${language}.wikipedia.org/api/rest_v1/page/metadata/${query}`;
}

function getArticleURl({ language, query }) {
  return `https://${language}.wikipedia.org/wiki/${query}`;
}

// The Wikipedia API data is a flat list with "level" attribute,
// We need to create a nested data structure so it's easier to work
// with the TocList function.
function createTocTree(toc) {
  // this is the root of our TocTree
  const result = { ...toc, children: [] };
  let currentParent = result;

  // we'll use these two variable to navigate between the list
  let lastEntry = null;
  let lastParent = currentParent;
  for (const entry of toc.entries) {
    // at the first iteration, we will always push the entry to currentParentChildren
    if (lastEntry) {
      // at the second iteration, we check if the level is higher
      if (entry.level > lastEntry.level) {
        // set lastParent as the current one, we need it to go back to the lower level
        lastParent = currentParent;
        // the currentParent is now the last entry, this where define we need to put ol inside li
        currentParent = lastEntry;
      }

      // in this case, we need to go back to the lower level, go back to the last parent
      if (entry.level < lastEntry.level) {
        currentParent = lastParent;
      }

      // TODO: find out if this still works if the last item is nested.
    }

    // the currentParent might not have any children property at all
    if (!currentParent.children) {
      currentParent.children = [];
    }
    currentParent.children.push(entry);
    // we need to save this so we can make it a currentParent
    lastEntry = entry;
  }
  return result;
}

// We need to parse the html we got from wikipedia api so we can format it accordingly
// This is like using dangerouslySetInnerHTML in react
const domParser = new DOMParser();
function parseHTML(html) {
  const body = domParser
    .parseFromString(html, "text/html")
    .querySelector("body");
  return body.childNodes;
}

// This is a recursive function that will call itself until
// it found a falsey / empty children. This is what's being used to
// render the list.
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
            href: `${articleUrl}#${child.anchor || ""}`,
            target: "_blank",
            rel: "noopener noreferrer"
          },
          // Hereby I trust that wikipedia sanitize their html input/output
          ...parseHTML(child.html)
        ),
        TocList({ ...child, articleUrl })
      )
    )
  );
}

// This function takes a dom and render it to the #wiki-result div.
// It's not too efficient, but fast enough for our app
function render(dom) {
  // The second time we render there would be a dom node here
  if (result.firstChild) {
    // remove it so the new dom object can take the place of the old one
    result.firstChild.remove();
  }
  result.appendChild(dom);
}

// When error happens, we render a pre element with a red background
// To the #wiki-result
const showStack = false;
function renderError(error) {
  console.error(error);
  const stack = showStack ? ["\n", error.stack] : [];
  return render(elt("pre", { class: "wiki-error" }, error.message, ...stack));
}

// This is a helper to create dom element in a declarative style.
// Inspired by react and a code example from Marijn Haverbeke's Eloquent Javascript
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
