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

  it("uses the selected year even when the source_images_prefix contains a stale year", () => {
    expect(
      buildExtractionPagePrefix(
        "Singapore",
        2024,
        "data-extraction/trimmed-png-singapore-2022/samko/samko_timber_limited_2022_sustainability_report/",
        "emissions",
      ),
    ).toBe(
      "data-extraction/trimmed-png-singapore-2024/samko/samko_timber_limited_2022_sustainability_report/Group_1_Emissions/",
    );
  });

  it("builds the expected Indonesia fuel prefix", () => {
    expect(
      buildExtractionPagePrefix(
        "Indonesia",
        2024,
        "data-extraction/trimmed-png-indonesia-2024/astra/astra_agro_lestari_tbk._2024_sustainability_report/",
        "fuel",
      ),
    ).toBe(
      "data-extraction/trimmed-png-indonesia-2024/astra/astra_agro_lestari_tbk._2024_sustainability_report/Group_4_Fuel/",
    );
  });

  it("throws a clear error when source_images_prefix is malformed", () => {
    expect(() =>
      buildExtractionPagePrefix("Singapore", 2024, "not-enough-segments", "water"),
    ).toThrow("Could not derive extraction page prefix from source_images_prefix.");
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

  it("removes leading zeros when formatting page numbers", () => {
    expect(parsePageNumberFromKey("foo/bar/page_004.png")).toBe("Page 4");
  });

  it("returns null when the page suffix is not numeric", () => {
    expect(parsePageNumberFromKey("foo/bar/page_ABC.png")).toBeNull();
  });
});
