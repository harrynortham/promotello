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
                Retire
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Retire “{label}”?</DialogTitle>

                        <DialogDescription>
                            It comes off this page, and you can bring it back
                            whenever you like. Anyone scanning a copy that is
                            still up lands on your business profile page with a
                            note that the poster is out of date, and those scans keep
                            counting &mdash; which is how you will know whether
                            it is still out there.
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
                                Retire poster
                            </Button>
                        </form>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
