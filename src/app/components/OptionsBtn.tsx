import DeleteBtn from "@/app/components/DeleteBtn.tsx";
import DropdownItemDeleteCookie from "@/app/components/cookie/DropdownItemDeleteCookie.tsx";
import { OptionsDropdown } from "@/app/components/shared/OptionsDropdown.tsx";
import DropdownItemLogout from "@/app/components/swagger/DropdownItemLogout.tsx";
import { useGlobalContext } from "@/context/global-context.tsx";
import { CookieData, isCookieData, SwaggerData } from "@/types/types.ts";
import { Fragment } from "react";

const OptionsBtn = ({data}: { data: CookieData | SwaggerData }) => {
    const { handleEdit } = useGlobalContext();
    const isCookie = isCookieData(data);
    const isSwagger = !isCookie;

    const customMenuItems = (
        <Fragment>
            {isCookie && <DropdownItemDeleteCookie data={data as CookieData}/>}
            {isSwagger && <DropdownItemLogout data={data as SwaggerData}/>}
        </Fragment>
    );

    return (
        <OptionsDropdown
            data={data}
            onEdit={handleEdit}
            customMenuItems={customMenuItems}
            deleteButton={<DeleteBtn data={data} />}
        />
    );
};

export default OptionsBtn;