import { CookieData } from "@/types/types";
import { ProjectFilter } from "../shared/ProjectFilter";

interface CookieFilterProps {
  cookies: CookieData[]
  onFilteredCookiesChange: (filteredCookies: CookieData[]) => void
}

const COOKIE_PROJECT_KEY = "cookify_selected_cookie_project";

export function CookieFilter({ cookies, onFilteredCookiesChange }: CookieFilterProps) {
  const additionalSearchFields = (cookie: CookieData) => [
    cookie.name,
    cookie.domain || ""
  ];

  return (
    <ProjectFilter
      items={cookies}
      onFilteredItemsChange={onFilteredCookiesChange}
      storageKey={COOKIE_PROJECT_KEY}
      additionalSearchFields={additionalSearchFields}
      longPressTime={3000}
    />
  )
} 