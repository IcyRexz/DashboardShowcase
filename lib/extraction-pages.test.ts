import { describe, expect, it } from "vitest";
import { buildExtractionPagePrefix, parsePageNumberFromKey } from "./extraction-pages";

describe("buildExtractionPagePrefix", () => {
  it("builds the expected Singapore emissions prefix", () => {
    expect(
      buildExtractionPagePrefix(
        "Singapore",
        2023,
        "data-extraction/trimmed-png-singapore-2023/midas_holdings_limited/midas_holdings_limited_2023_sustainability_report/",
        "emissions",
      ),
    ).toBe(
      "data-extraction/trimmed-png-singapore-2023/midas_holdings_limited/midas_holdings_limited_2023_sustainability_report/Group_1_Emissions/",
    );
  });

  it("builds the expected Malaysia water prefix", () => {
    expect(
      buildExtractionPagePrefix(
        "Malaysia",
        2023,
        "data-extraction/trimmed-png-malaysia-2023/able/able_global_berhad_2023_sustainability_report/",
        "water",
      ),
    ).toBe(
      "data-extraction/trimmed-png-malaysia-2023/able/able_global_berhad_2023_sustainability_report/Group_2_Water/",
    );
  });
});

describe("parsePageNumberFromKey", () => {
  it("extracts the page number from a PNG object key", () => {
    expect(
      parsePageNumberFromKey(
        "data-extraction/trimmed-png-singapore-2023/midas_holdings_limited/midas_holdings_limited_2023_sustainability_report/Group_1_Emissions/page_031.png",
      ),
    ).toBe("Page 31");
  });

  it("returns null for non-page keys", () => {
    expect(parsePageNumberFromKey("foo/bar/not-a-page.txt")).toBeNull();
  });
});
