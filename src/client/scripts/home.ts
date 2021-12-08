import * as d3 from "d3";

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
  const searchInput = d3.select<HTMLInputElement, null>("#search-input");
  const searchIcon = d3.select<HTMLElement, null>("#search-icon");
  const searchResultDropdown = d3.select<HTMLElement, null>("#search-dropdown");

  let searchCache: SearchResponse | null = null;
  let onGoingRequest: AbortController | null = null;

  /* function definition */
  const searchRequest = async (query: string) => {
    try {
      const controller = new AbortController();
      const { signal } = controller;

      onGoingRequest?.abort();
      onGoingRequest = controller;

      // create url
      const url = new URL("https://crates.io/api/v1/crates");

      url.searchParams.append("page", "1");
      url.searchParams.append("per_page", "8");
      url.searchParams.append("q", query);
      url.searchParams.append("sort", "downloads");

      // send request
      const res = await fetch(url.toString(), { signal });

      onGoingRequest = null;
  
      const data = await res.json() as SearchResponse;

      /* if not delayed */
      if (searchInput.property("value")) {
        renderSearchResponse(data, query);
      }

      searchCache = data;
    }
    catch (err) {
  
    }
  };

  const clearSearchResults = () => {
    searchResultDropdown
      .remove()
      .selectChildren()
      .remove();

    searchContainer.style.marginBottom = `${SERACH_MARGIN}px`;
  };
  
  const renderSearchResponse = (data: SearchResponse, query: string) => {
    clearSearchResults();

    if (!data.crates.length) {
      return;
    }

    // show dropdown
    searchContainer.style.marginBottom = `${SERACH_MARGIN - Math.min(data.crates.length, 8) * 40}px`;
    searchContainer.appendChild(searchResultDropdown.node());

    const row = searchResultDropdown
      .selectAll("div")
      .data(data.crates)
      .enter()
      .append("div")
      .classed("result-row", true)
      .on("mouseover", (e) => {
        searchResultDropdown.select(".sel").classed("sel", false);

        d3.select(e.target).classed("sel", true);
      })
      .on("click", () => handleSearch());

    row.append("div").html((d) => getFormattedQuery(d.name, query));
    row.append("div").text((d) => d.max_stable_version || d.max_version);

    // add selection
    searchResultDropdown.selectChild().classed("sel", true);
  };

  /* handle seach */
  const handleSearch = () => {
    const selEl = d3.select(".sel");

    if (selEl.empty()) {
      return;
    }

    const name = selEl.selectChild().text();

    window.location.href = `/crates/${name}`;
  };

  /* selection functions */
  const selectUp = () => {
    const selEl = d3.select<HTMLElement, null>(".sel");
    const prevSibling = selEl.node()?.previousElementSibling;

    if (prevSibling) {
      selEl.classed("sel", false);
      prevSibling.classList.add("sel");
    }
  };

  const selectDown = () => {
    const selEl = d3.select<HTMLElement, null>(".sel");
    const nextSibling = selEl.node()?.nextElementSibling;
    
    if (nextSibling) {
      selEl.classed("sel", false);
      nextSibling.classList.add("sel");
    }
  };

  /* document main event listeners */
  d3.select("body").on("click", () => {
    clearSearchResults();
  });

  /* search container event listeners */
  searchContainer.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  /* search event listeners */
  searchInput.on("input", async () => {
    const value = searchInput.property("value") as string;

    if (value) {
      await searchRequest(value);
    }
    else {
      clearSearchResults();
    }
  });

  searchInput.on("focus", () => {
    const value = searchInput.property("value") as string;

    if (searchCache && value) {
      renderSearchResponse(searchCache, value);
    }
    else {
      clearSearchResults();
    }
  });

  searchInput.on("keydown", (e) => {
    if (e.code === "Enter") {
      e.preventDefault();
      handleSearch();
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
  searchIcon.on("click", () => {
    handleSearch();
  });

  searchResultDropdown.attr("hidden", null).remove();
};

export default runHome;
