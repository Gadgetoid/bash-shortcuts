import { Button, ButtonItem, ConfirmModal, Menu, MenuItem, PanelSection, PanelSectionRow, showContextMenu, showModal, Spinner } from "decky-frontend-lib";
import { Fragment, useState } from "react";
import { PyInterop } from "../PyInterop";
import { Shortcut } from "../Shortcut";

import { FaEllipsisH } from "react-icons/fa";
import { EditModal } from "./EditModal";

type ShortcutModProps = {
    shortcut: Shortcut
}

type ShortcutsDictionary = {
    [key:string]: Shortcut
}

function showMenu(e: MouseEvent, shortcut: Shortcut) {
    return showContextMenu(
        <Menu label="Menu" cancelText="Cancel" onCancel={() => {}}>
        <MenuItem onSelected={() => {showModal(
            // @ts-ignore
            <EditModal onConfirm={(updated:Shortcut) => {PyInterop.modShortcut(updated)}} />
        )}}>Edit</MenuItem>
        <MenuItem onSelected={() => {showModal(
            <ConfirmModal onOK={() => {PyInterop.remShortcut(shortcut)}} bDestructiveWarning={true}>
                Are you sure you want to delete this shortcut?
            </ConfirmModal>
        )}}>Delete</MenuItem>
        </Menu>,
        e.currentTarget ?? window
    );
}

function ShortcutMod(props: ShortcutModProps) {
    return (
        <>
            <style>
                {`
                    .custom-buttons {
                        width: inherit;
                        height: inherit;
                        display: inherit;
                    }
                    .custom-buttons .DialogButton._DialogLayout.Secondary.gamepaddialog_Button_1kn70.Focusable {
                        min-width: 30px;
                        display: flex;
                        justify-content: center,
                        align-items: center
                    }
                `}
            </style>
            <PanelSectionRow>
                <div className="custom-buttons">
                    <ButtonItem label={props.shortcut.name} onClick={ (e) => showMenu(e, props.shortcut) } >
                        <FaEllipsisH />
                    </ButtonItem>
                </div>
            </PanelSectionRow>
        </>
    );
}

let loaded = false;
export function ManageShortcuts() {
    const [shortcuts, setShortcuts] = useState<ShortcutsDictionary | undefined>();
    const [loading, setLoading] = useState<boolean>(true);

    async function reload() {
        loaded = false;
        await PyInterop.getShortcuts().then((res) => {
            setShortcuts(res.result as ShortcutsDictionary);
            PyInterop.key = PyInterop.key == 0 ? 1 : 0;
            setLoading(false);
            loaded = true;
        });
    }
      
    if (!loaded) {
        reload();
    }
    
    return (
        <>
            <div style={{
                marginBottom: "5px"
            }}>Here you can re-order or remove existing shortcuts</div>
            <PanelSection title="Your Shortcuts">
                {loading ? 
                    <div style={{width: "100%", display: "flex", justifyContent: "center", alignItems: "center", padding: "5px"}}>
                        <Spinner style={{width: "60px", height: "60px"}} />
                    </div> : (
                    Object.values(shortcuts as ShortcutsDictionary).length > 0 ?
                        Object.values(shortcuts ? shortcuts : {})
                            .map((itm: Shortcut) => (
                            <ShortcutMod shortcut={itm} />
                        )) : (
                            <div style={{width: "100%", display: "flex", justifyContent: "center", alignItems: "center", padding: "5px"}}>
                                You don't have any shortcuts right now! You can create new shortcuts from the add menu to the left.
                            </div>
                        )
                    )
                }
                <PanelSectionRow>
                    <ButtonItem layout="below" onClick={reload} >
                        Reload Shortcuts
                    </ButtonItem>
                </PanelSectionRow>
            </PanelSection>
        </>
    );
}