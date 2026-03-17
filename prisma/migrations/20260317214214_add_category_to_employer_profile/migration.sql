-- DropForeignKey
ALTER TABLE "EmployerProfile" DROP CONSTRAINT "EmployerProfile_categoryId_fkey";

-- CreateTable
CREATE TABLE "_CategoryToEmployerProfile" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CategoryToEmployerProfile_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_CategoryToEmployerProfile_B_index" ON "_CategoryToEmployerProfile"("B");

-- AddForeignKey
ALTER TABLE "_CategoryToEmployerProfile" ADD CONSTRAINT "_CategoryToEmployerProfile_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToEmployerProfile" ADD CONSTRAINT "_CategoryToEmployerProfile_B_fkey" FOREIGN KEY ("B") REFERENCES "EmployerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
