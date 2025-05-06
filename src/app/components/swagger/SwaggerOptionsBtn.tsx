import { Fragment } from 'react';

import { useGlobalContext } from "@/context/global-context.tsx";

import { OptionsDropdown } from "@/app/components/shared/OptionsDropdown.tsx";
import { SwaggerData } from "@/types/types.ts";

/* These components are currently not compiled */
import { RemoveSwagger } from "./RemoveSwagger.tsx";
import { SwaggerDeleteBtn } from "./SwaggerDeleteBtn.tsx";

const SwaggerOptionsBtn = ({ swagger }: { swagger: SwaggerData }) => {
    const { handleEditSwagger } = useGlobalContext();

    const customMenuItems = (
        <Fragment>
            <RemoveSwagger swagger={swagger} />
        </Fragment>
    );

    return (
        <OptionsDropdown
            data={swagger}
            onEdit={handleEditSwagger}
            customMenuItems={customMenuItems}
            deleteButton={<SwaggerDeleteBtn swagger={swagger} />}
        />
    );
};

export default SwaggerOptionsBtn;