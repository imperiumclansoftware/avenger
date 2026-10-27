<?php

namespace App\Wiki;

use App\Dto\WikiPageRequest;
use App\Entity\Wiki;
use App\Entity\WikiPage;
use App\Product\SlugTakenException;
use App\Repository\WikiPageRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\String\Slugger\SluggerInterface;

final class WikiManager
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly WikiPageRepository $pages,
        private readonly SluggerInterface $slugger,
    ) {
    }

    /** @throws SlugTakenException */
    public function create(Wiki $wiki, WikiPageRequest $request): WikiPage
    {
        $title = trim($request->title);
        $slug = $request->slug ?: $this->slugger->slug($title)->lower()->toString();
        if ($this->pages->slugExists($wiki, $slug)) {
            throw new SlugTakenException($slug);
        }

        $page = new WikiPage($wiki, $title, $slug, $request->content);
        $wiki->addPage($page);
        $this->em->persist($page);
        $this->em->flush();

        return $page;
    }

    /** @throws SlugTakenException */
    public function update(WikiPage $page, WikiPageRequest $request): void
    {
        // The home page keeps its address: it is the entry point of the wiki
        $slug = $page->isHome() ? $page->getSlug() : ($request->slug ?: $page->getSlug());
        if ($this->pages->slugExists($page->getWiki(), $slug, $page)) {
            throw new SlugTakenException($slug);
        }

        $page->update(trim($request->title), $slug, $request->content);
        $this->em->flush();
    }

    public function delete(WikiPage $page): void
    {
        if ($page->isHome()) {
            throw new \LogicException('The home page of a wiki cannot be deleted.');
        }
        $page->getWiki()->removePage($page);
        $this->em->flush();
    }
}
