import * as d3 from "d3";

/* main */
export const initSearchBar = () => {
  const searchContainer = d3.select<HTMLElement, null>(".search-bar__grid");
  const searchInput = d3.select<HTMLInputElement, null>(".search-bar__input");
  const searchIcon = d3.select<HTMLElement, null>(".search-bar__icon");
  const searchResultDropdown = d3.select<HTMLElement, SearchResponse["crates"]>(
    ".search-bar__dropdown"
  );
  const errorMsg = d3.select<HTMLElement, null>(".error-msg");

  let cachedSearchData: SearchResponse | null = null;
  let onGoingRequest: AbortController | null = null;

  /* function definition */
  const searchRequest = async (query: string) => {
    errorMsg.text("");

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

      // proess data
      onGoingRequest = null;
      cachedSearchData = (await res.json()) as SearchResponse;

      // if not delayed
      if (searchInput.property("value")) {
        renderSearchResponse(cachedSearchData, query);
      } else {
        cachedSearchData = null;
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name !== "AbortError") {
          errorMsg.text("Something went wrong! Please try again.");
        }
      }
    }
  };

  const hideDropdownResult = () => {
    searchResultDropdown.remove();
  };

  const getSearchString = () => {
    return searchInput.property("value") as string;
  };

  const search = (searchString: string) => {
    window.location.href = `/crates/${searchString}`;
  };

  const renderSearchResponse = (data: SearchResponse, query: string) => {
    if (data.crates.length) {
      searchContainer.append(() => searchResultDropdown.node());
    } else {
      hideDropdownResult();
    }

    const row = searchResultDropdown
      .selectAll<d3.BaseType, (typeof data.crates)[number]>("div")
      .data(data.crates, (d) => d.id)
      .join("div")
      .classed("result-row", true)
      .classed("sel", (d, i) => i === 0)
      .on("mouseover", (e, d1) => {
        searchResultDropdown.selectChildren().classed("sel", (d2) => d1 === d2);
      })
      .on("click", () => handleSearch());

    row
      .join("div")
      .append("div")
      .each(function(d) {
        const container = d3.select(this);
        const regex = new RegExp(query, "gi");
        const parts = d.name.split(regex);
        const matches = d.name.match(regex);

        container.text(null);
    
        parts.forEach((part, i) => {
          container.append("span").text(part);
          if (matches && matches[i]) {
            container.append("span").text(matches[i]).classed("matched", true)
          }
        });
      });
    row
      .join("div")
      .append("div")
      .text((d) => d.max_stable_version || d.max_version);
  };

  /* handle seach */
  const handleSearch = () => {
    const selEl = d3.select(".sel");
    const value = selEl.empty()
      ? getSearchString()
      : selEl.selectChild().text();

    if (!value) {
      return;
    }

    hideDropdownResult();
    searchInput.node()?.blur();

    search(value);
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
    hideDropdownResult();
  });

  /* search container event listeners */
  searchContainer.on("click", (e: MouseEvent) => {
    e.stopPropagation();
  });

  /* search event listeners */
  searchInput.on("input", async () => {
    const value = getSearchString();

    if (value) {
      await searchRequest(value);
    } else {
      hideDropdownResult();
    }
  });

  searchInput.on("focus", () => {
    const value = getSearchString();

    if (cachedSearchData && value) {
      renderSearchResponse(cachedSearchData, value);
    } else {
      hideDropdownResult();
    }
  });

  searchInput.on("keydown", (e: KeyboardEvent) => {
    if (e.code === "Enter") {
      e.preventDefault();
      handleSearch();
    } else if (e.code === "ArrowDown") {
      e.preventDefault();
      selectDown();
    } else if (e.code === "ArrowUp") {
      e.preventDefault();
      selectUp();
    }
  });

  /* search icon event listener */
  searchIcon.on("click", () => {
    handleSearch();
  });

  /* initialize dropdown element */
  searchResultDropdown.attr("hidden", null).remove();
};
