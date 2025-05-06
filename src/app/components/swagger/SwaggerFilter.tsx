import { SwaggerData } from "@/types/types";
import { ProjectFilter } from "../shared/ProjectFilter";

interface SwaggerFilterProps {
  swaggers: SwaggerData[]
  onFilteredSwaggersChange: (filteredSwaggers: SwaggerData[]) => void
}

const SWAGGER_PROJECT_KEY = "cookify_selected_swagger_project";

export function SwaggerFilter({ swaggers, onFilteredSwaggersChange }: SwaggerFilterProps) {
  return (
    <ProjectFilter
      items={swaggers}
      onFilteredItemsChange={onFilteredSwaggersChange}
      storageKey={SWAGGER_PROJECT_KEY}
      longPressTime={2000}
    />
  )
} 