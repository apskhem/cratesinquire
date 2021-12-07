const SERACH_MARGIN = 120;

/* utils */
const getFormattedQuery = (value: string, query: string) => {
  return value.replace(new RegExp(query, "gi"), (value) => {
    return `<span>${value}</span>`;
  });
};

/* main */
const runHome = () => {
  const searchContainer = document.getElementById("search-bar-container");
  const searchInput = document.getElementById("search-input") as HTMLInputElement;
  const searchIcon = document.getElementById("search-icon");
  const searchResultDropdown = document.getElementById("search-dropdown");

  let searchCache: SearchResponse | null = null;
  let onGoingRequest: AbortController | null = null;

  /* function definition */
  const searchRequest = async (query: string) => {
    try {
      const controller = new AbortController();
      const { signal } = controller;

      onGoingRequest?.abort();
      onGoingRequest = controller;

      const res = await fetch(`https://crates.io/api/v1/crates?page=1&per_page=8&q=${query}&sort=downloads`, { signal });

      onGoingRequest = null;
  
      const data = await res.json() as SearchResponse;

      /* if not delayed */
      if (searchInput.value) {
        renderSearchResponse(data, query);
      }

      searchCache = data;
    }
    catch (err) {
  
    }
    finally {
  
    }
  };

  const clearSearchResults = () => {
    while (searchResultDropdown.firstElementChild) {
      searchResultDropdown.firstElementChild.remove();
    }

    searchResultDropdown.remove();
    searchContainer.style.marginBottom = `${SERACH_MARGIN}px`;
  };
  
  const renderSearchResponse = (data: SearchResponse, query: string) => {
    clearSearchResults();

    if (!data.crates.length) {
      return;
    }

    for (const crate of data.crates) {
      const row = document.createElement("div");
      const packageName = document.createElement("div");
      const packageVersion = document.createElement("div");

      row.classList.add("result-row");
      packageName.innerHTML = getFormattedQuery(crate.name, query);
      packageVersion.textContent = crate.newest_version;

      // append row
      row.appendChild(packageName);
      row.appendChild(packageVersion);

      searchResultDropdown.appendChild(row);

      // add event listener
      row.addEventListener("mouseover", () => {
        searchResultDropdown.getElementsByClassName("sel")[0].classList.remove("sel");

        row.classList.add("sel");
      });

      row.addEventListener("click", () => {
        searchIcon.click();
      });
    }

    // show dropdown
    searchContainer.style.marginBottom = `${SERACH_MARGIN - Math.min(data.crates.length, 8) * 40}px`;
    searchContainer.appendChild(searchResultDropdown);

    // add selection
    searchResultDropdown.firstElementChild?.classList.add("sel");
  };

  /* selection functions */
  const selectUp = () => {
    const selEl = searchResultDropdown.getElementsByClassName("sel")[0] as HTMLElement;

    if (selEl.previousElementSibling) {
      selEl.classList.remove("sel");
      selEl.previousElementSibling.classList.add("sel");
    }
  };

  const selectDown = () => {
    const selEl = searchResultDropdown.getElementsByClassName("sel")[0] as HTMLElement;

    if (selEl.nextElementSibling) {
      selEl.classList.remove("sel");
      selEl.nextElementSibling.classList.add("sel");

      console.log(selEl.offsetTop);
    }
  };

  /* document main event listeners */
  document.body.addEventListener("click", () => {
    clearSearchResults();
  });

  /* search container event listeners */
  searchContainer.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  /* search event listeners */
  searchInput.addEventListener("input", async (e) => {
    const value = searchInput.value;

    if (value) {
      searchRequest(value);
    }
    else {
      clearSearchResults();
    }
  });

  searchInput.addEventListener("focus", () => {
    const value = searchInput.value;

    if (searchCache && value) {
      renderSearchResponse(searchCache, value);
    }
    else {
      clearSearchResults();
    }
  });

  searchInput.addEventListener("keydown", (e) => {
    if (e.code === "Enter") {
      e.preventDefault();
      searchIcon.click();
    }
    else if (e.code === "ArrowDown") {
      e.preventDefault();
      selectDown();
    }
    else if (e.code === "ArrowUp") {
      e.preventDefault();
      selectUp();
    }
  });

  /* search icon event listener */
  searchIcon.addEventListener("click", () => {
    const selEl = searchResultDropdown.getElementsByClassName("sel")[0];

    if (!selEl) {
      return;
    }

    const name = selEl.firstElementChild.textContent;

    window.location.href = `/crates/${name}`;
  });

  searchResultDropdown.removeAttribute("hidden");
  searchResultDropdown.remove();
};

export default runHome;
