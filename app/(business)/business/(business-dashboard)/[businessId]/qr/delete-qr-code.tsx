"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { deleteQrCode } from "./actions";

export function DeleteQrCode({
    businessId,
    codeId,
    label,
}: {
    businessId: string;
    codeId: string;
    label: string;
}) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(true)}
            >
                Delete
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete “{label}”?</DialogTitle>

                        <DialogDescription>
                            Anyone scanning that poster will no longer reach
                            your page, so take it down if it is still up. The
                            scans it has already had stay in your analytics.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            onClick={() => setIsOpen(false)}
                        >
                            Keep it
                        </Button>

                        <form action={deleteQrCode}>
                            <input type="hidden" name="businessId" value={businessId} />
                            <input type="hidden" name="codeId" value={codeId} />

                            <Button type="submit" variant="destructive" size="lg">
                                Delete code
                            </Button>
                        </form>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
